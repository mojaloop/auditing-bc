/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Coil
 - Jason Bruwer <jason.bruwer@coil.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict";

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
    IRawMessage,
    MLKafkaRawConsumer,
    MLKafkaRawConsumerOutputType
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import {AuditingAggregate} from "../domain/auditing_agg";
import {IAuditAggregateCryptoProvider, IAuditRepo} from "../domain/domain_interfaces";
import {AuditAggregateCryptoProvider} from "../infrastructure/audit_agg_crypto_provider";
import {ElasticsearchAuditStorage} from "../infrastructure/es_audit_storage";
import {SignedSourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";
import {IRawMessageConsumer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib/dist/raw/raw_types";
import {existsSync} from "fs";

const BC_NAME = "auditing-bc";
const APP_NAME = "auditing-svc";
const APP_VERSION = process.env.npm_package_version || "0.0.1";
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL:LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_AUDITS_TOPIC = "audits";
const KAFKA_LOGS_TOPIC = "logs";

const ELASTICSEARCH_URL = process.env["ELASTICSEARCH_URL"] || "https://localhost:9200";
const ELASTICSEARCH_AUDITS_INDEX = process.env["ELASTICSEARCH_AUDITS_INDEX"] || "ml-auditing";
const ELASTICSEARCH_USERNAME =  process.env["ELASTICSEARCH_USERNAME"] || "elastic";
const ELASTICSEARCH_PASSWORD =  process.env["ELASTICSEARCH_PASSWORD"] ||  "elasticSearchPas42";

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "./app/data/audit_private_key.pem";

const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

let globalLogger: ILogger;

export class Service {
    static logger: ILogger;
    static agg: AuditingAggregate;
    static aggRepo: IAuditRepo;
    static aggCrypto: IAuditAggregateCryptoProvider;
    static kafkaConsumer: IRawMessageConsumer;

    static async start(
            logger?: ILogger,
            aggRepo?: IAuditRepo,
            aggCrypto?: IAuditAggregateCryptoProvider,
            kafkaConsumer?: IRawMessageConsumer,
    ): Promise<void> {
        if (!logger) {
            logger = new KafkaLogger(
                    BC_NAME,
                    APP_NAME,
                    APP_VERSION,
                    kafkaProducerOptions,
                    KAFKA_LOGS_TOPIC,
                    LOG_LEVEL
            );
            await (logger as KafkaLogger).init();
        }
        globalLogger = this.logger = logger;

        if (!aggRepo) {
            const elasticOpts = {
                node: ELASTICSEARCH_URL,
                auth: {
                    username: ELASTICSEARCH_USERNAME,
                    password: ELASTICSEARCH_PASSWORD,
                },
                tls: {
                    ca: process.env.elasticsearch_certificate,
                    rejectUnauthorized: false,
                }
            };

            aggRepo = new ElasticsearchAuditStorage(elasticOpts, ELASTICSEARCH_AUDITS_INDEX, this.logger);
            await aggRepo.init();
        }
        this.aggRepo = aggRepo;

        if (!aggCrypto) {
            if (!existsSync(AUDIT_KEY_FILE_PATH)) {
                if (PRODUCTION_MODE) throw new Error("Code is running in PRODUCTION_MODE without a valid AUDIT_KEY_FILE_PATH");
                AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
            }
            aggCrypto = new AuditAggregateCryptoProvider(AUDIT_KEY_FILE_PATH, this.logger);
            await aggCrypto.init();
        }
        this.aggCrypto = aggCrypto;

        this.agg = new AuditingAggregate(BC_NAME, APP_NAME, APP_VERSION, this.aggRepo, this.aggCrypto, this.logger);

        logger.info("AuditingAggregate initialised");

        if (!kafkaConsumer) {
            const kafkaConsumerOptions = {
                kafkaBrokerList: KAFKA_URL,
                kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
                outputType: MLKafkaRawConsumerOutputType.Json
            };
            kafkaConsumer = new MLKafkaRawConsumer(kafkaConsumerOptions, logger.createChild("kafkaConsumer"));
        }
        this.kafkaConsumer = kafkaConsumer;

        this.kafkaConsumer.setTopics([KAFKA_AUDITS_TOPIC]);
        this.kafkaConsumer.setCallbackFn(this.agg.processMessage.bind(this.agg));

        await this.kafkaConsumer.connect();
        await this.kafkaConsumer.start();

        logger.info("Auditing Service initialised and ready");
    }

    static async stop(force = false): Promise<void> {
        if (this.kafkaConsumer) {
            await this.kafkaConsumer.stop();
            await this.kafkaConsumer.disconnect(force);
            await this.kafkaConsumer.destroy(force);
        }
        if (this.aggRepo) await this.aggRepo.destroy();
        if (this.aggCrypto) await this.aggCrypto.destroy();
    }
}

/**
 * process termination and cleanup
 */

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
    console.info(`Service - ${signal} received - cleaning up...`);
    await Service.stop(true);
    process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals);
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals);

//do something when app is closing
process.on("exit", async () => {
    globalLogger.info("Microservice - exiting...");
});
process.on("uncaughtException", (err: Error) => {
    globalLogger.error(err);
});

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


import {AuditMainRoutes} from "./routes";


import express, {Express} from "express";
import {Server} from "net";
import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
    IRawMessage,
    MLKafkaRawConsumer,
    MLKafkaRawConsumerOutputType
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {KafkaLogger} from "@mojaloop/logging-bc-client-lib";
import process from "process";
import {AuditingAggregate} from "../domain/auditing_agg";
import {IAuditAggregateCryptoProvider, IAuditRepo} from "../domain/domain_interfaces";
import {AuditAggregateCryptoProvider} from "../infrastructure/audit_agg_crypto_provider";
import {ElasticsearchAuditStorage} from "../infrastructure/es_audit_storage";
import {IRawMessageConsumer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib/dist/raw/raw_types";
import {existsSync} from "fs";


// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJSON = require("../../package.json");

const BC_NAME = "auditing-bc";
const APP_NAME = "auditing-svc";
const APP_VERSION = packageJSON.version;
const PRODUCTION_MODE = process.env["PRODUCTION_MODE"] || false;
const LOG_LEVEL:LogLevel = process.env["LOG_LEVEL"] as LogLevel || LogLevel.DEBUG;

const KAFKA_AUDITS_TOPIC = "audits";
const KAFKA_LOGS_TOPIC = "logs";

const ELASTICSEARCH_URL = process.env["ELASTICSEARCH_URL"] || "https://localhost:9200";
const ELASTICSEARCH_AUDITS_INDEX = process.env["ELASTICSEARCH_AUDITS_INDEX"] || "ml-auditing";
const ELASTICSEARCH_USERNAME =  process.env["ELASTICSEARCH_USERNAME"] || "elastic";
const ELASTICSEARCH_PASSWORD =  process.env["ELASTICSEARCH_PASSWORD"] ||  "elasticSearchPas42";

const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const AUDIT_KEY_FILE_PATH = process.env["AUDIT_KEY_FILE_PATH"] || "/app/data/audit_private_key.pem";
const SVC_DEFAULT_HTTP_PORT = process.env["SVC_DEFAULT_HTTP_PORT"] || 3050;

const kafkaProducerOptions = {
    kafkaBrokerList: KAFKA_URL
};

let globalLogger: ILogger;

const SERVICE_START_TIMEOUT_MS = 60_000;

export class Service {
    static logger: ILogger;
    static app: Express;
    static expressServer: Server;
    static agg: AuditingAggregate;
    static auditRepo: IAuditRepo;
    static aggCrypto: IAuditAggregateCryptoProvider;
    static kafkaConsumer: IRawMessageConsumer;
    static startupTimer: NodeJS.Timeout;

    static async start(
            logger?: ILogger,
            aggRepo?: IAuditRepo,
            aggCrypto?: IAuditAggregateCryptoProvider,
            kafkaConsumer?: IRawMessageConsumer,
    ): Promise<void> {
        console.log(`Service starting with PID: ${process.pid}`);

        this.startupTimer = setTimeout(()=>{
            throw new Error("Service start timed-out");
        }, SERVICE_START_TIMEOUT_MS);

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
        this.auditRepo = aggRepo;

        if (!aggCrypto) {
            if (!existsSync(AUDIT_KEY_FILE_PATH)) {
                if (PRODUCTION_MODE) throw new Error("Code is running in PRODUCTION_MODE without a valid AUDIT_KEY_FILE_PATH");
                AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
            }
            aggCrypto = new AuditAggregateCryptoProvider(AUDIT_KEY_FILE_PATH, this.logger);
            await aggCrypto.init();
        }
        this.aggCrypto = aggCrypto;

        this.agg = new AuditingAggregate(BC_NAME, APP_NAME, APP_VERSION, this.auditRepo, this.aggCrypto, this.logger);

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
        await this.kafkaConsumer.startAndWaitForRebalance();

        await this.setupExpress();

        // remove startup timeout
        clearTimeout(this.startupTimer);

    }

    static setupExpress(): Promise<void> {
        return new Promise<void>(resolve => {
            this.app = express();
            this.app.use(express.json()); // for parsing application/json
            this.app.use(express.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

            // Add health and metrics http routes
            this.app.get("/health", (req: express.Request, res: express.Response) => {return res.send({ status: "OK" }); });
            // this.app.get("/metrics", async (req: express.Request, res: express.Response) => {
            //     const strMetrics = await (this.metrics as PrometheusMetrics).getMetricsForPrometheusScrapper();
            //     return res.send(strMetrics);
            // });

            // Add admin and client http routes
            const mainRoutes = new AuditMainRoutes(this.logger, this.auditRepo);
            this.app.use(mainRoutes.mainRouter);

            this.app.use((req, res) => {
                // catch all
                res.send(404);
            });

            this.expressServer = this.app.listen(SVC_DEFAULT_HTTP_PORT, () => {
                this.logger.info(`Auditing Service service v: ${APP_VERSION} initialised`);
                globalLogger.info(`🚀Server ready at: http://localhost:${SVC_DEFAULT_HTTP_PORT}`);
                globalLogger.info(`Auditing Service started, version: ${APP_VERSION}`);
                resolve();
            });

        });
    }

    static async stop(force = false): Promise<void> {
        if (this.kafkaConsumer) {
            await this.kafkaConsumer.stop();
            await this.kafkaConsumer.disconnect(force);
            await this.kafkaConsumer.destroy(force);
        }
        if (this.auditRepo) await this.auditRepo.destroy();
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

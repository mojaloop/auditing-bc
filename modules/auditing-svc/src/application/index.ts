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

 --------------
 ******/

"use strict"

import {ILogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {
  MLKafkaConsumer,
  MLKafkaConsumerOutputType
} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";
import {AuditingAggregate} from "../domain/auditing_agg";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {IAuditAggregateCryptoProvider, IAuditRepo} from "../domain/domain_interfaces";
import {AuditAggregateCryptoProvider} from "../infrastructure/audit_agg_crypto_provider";
import {ElasticsearchAuditStorage} from "../infrastructure/es_audit_storage";
import {SignedSourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";

const BC_NAME = "auditing-bc";
const APP_NAME = "auditing-svc";
const APP_VERSION = "0.0.1";
const LOGLEVEL = LogLevel.DEBUG;

const KAFKA_AUDITS_TOPIC = "audits";

const ES_AUDITING_INDEX = "mjl-auditing";
const DEV_ES_USERNAME = "elastic";
const DEV_ES_PASSWORD = "123@Edd!1234SS";


const elasticOpts = { node: 'https://localhost:9200',
  auth: {
    username: process.env.ES_USERNAME || DEV_ES_USERNAME,
    password: process.env.ES_PASSWORD || DEV_ES_PASSWORD,
  },
  tls: {
    ca: process.env.elasticsearch_certificate,
    rejectUnauthorized: false,
  }
};

// Event Handler
const kafkaConsumerOptions = {
  kafkaBrokerList: "localhost:9092",
  kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
  outputType: MLKafkaConsumerOutputType.Json
}


const logger:ILogger = new DefaultLogger(BC_NAME, APP_NAME, APP_VERSION, LOGLEVEL);

let agg: AuditingAggregate;
let kafkaConsumer: MLKafkaConsumer;
let aggRepo:IAuditRepo;
let aggCrypto:IAuditAggregateCryptoProvider;

async function start():Promise<void> {
  // todo create aggRepo

  aggRepo = new ElasticsearchAuditStorage(elasticOpts, ES_AUDITING_INDEX, logger);
  await aggRepo.init();

  aggCrypto = new AuditAggregateCryptoProvider("../../test_keys/3_private.pem");
  await aggCrypto.init();

  agg = new AuditingAggregate(BC_NAME, APP_NAME, APP_VERSION, aggRepo, aggCrypto, logger);

  logger.info("AuditingAggregate initialised");

  kafkaConsumer = new MLKafkaConsumer(kafkaConsumerOptions, logger);
  kafkaConsumer.setTopics([KAFKA_AUDITS_TOPIC]);
  kafkaConsumer.setCallbackFn(processLogMessage);
  await kafkaConsumer.connect();
  await kafkaConsumer.start();

  logger.info("kafkaConsumer initialised");
}

async function processLogMessage (message: IMessage) : Promise<void> {
  const value = message.value;

  await agg.processSignedSourceAuditEntry(value as SignedSourceAuditEntry);
}

/**
* process termination and cleanup
*/

async function _handle_int_and_term_signals(signal: NodeJS.Signals): Promise<void> {
  logger.info(`Service - ${signal} received - cleaning up...`);
  process.exit();
}

//catches ctrl+c event
process.on("SIGINT", _handle_int_and_term_signals.bind(this));
//catches program termination event
process.on("SIGTERM", _handle_int_and_term_signals.bind(this));

//do something when app is closing
process.on("exit", async () => {
  logger.info("Microservice - exiting...");
  await kafkaConsumer.destroy(true);
  await aggRepo.destroy();
  await aggCrypto.destroy();
});


start();

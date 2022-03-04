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

'use strict'

import { AuditEntry } from '@mojaloop/auditing-bc-auditing-types-lib'
import {
  MLKafkaProducerOptions,
  MLKafkaConsumer,
  MLKafkaConsumerOptions,
  MLKafkaConsumerOutputType } from '@mojaloop/platform-shared-lib-nodejs-kafka-client-lib'

import { ConsoleLogger } from "@mojaloop/logging-bc-logging-client-lib";
import { IMessage } from '@mojaloop/platform-shared-lib-messaging-types-lib';

import { MLAuditClient } from "../../../auditing-client-lib/src/audit_client";
import {MLKafkaAuditDispatcher} from "../../../auditing-client-lib/src/kafka_audit_dispatcher";
import {MLAuditServer} from "../../src/audit_server";
import {MLKafkaAuditConsumer} from "../../src/kafka_audit_consumer";
import {MLConsoleAuditProcessor} from "../../src/mock_audit_processor";

const logger: ConsoleLogger = new ConsoleLogger()

let producerOptions: MLKafkaProducerOptions
let processor: MLConsoleAuditProcessor
let consumerOptions: MLKafkaConsumerOptions

let auditClient : MLAuditClient;
let auditServer : MLAuditServer;

const TOPIC_NAME = 'nodejs-rdkafka-producer-integration-test-audit-bc-topic'

const sampleAE: AuditEntry = {
  'id' : 1,
  'originalTimestamp' : Date.now(),
  'persistenceTimestamp' : Date.now(),
  'functionTransaction' : 'fc',
  'sourceBCSystemId' : 'audit-bc-sys',
  'sourceBCId' : 'audit-bc',
  'sourceBCSignature' : Buffer.from('audit-bc-sig'),
  'sourceBCKeyId' : 'audit-bc-key',
  'sourceBCNetworkIdentifiers' : [],
  'securityContext' : [],
  'actionType' : 'persist-audit',
  'success' : true,
  'metaTrackingInfo' : [],
  'labels' : []
}

describe('nodejs-rdkafka-audit-bc', () => {

  beforeAll(async () => {
    // Client
    producerOptions = {
      kafkaBrokerList: 'localhost:9092',
      producerClientId: 'test_producer'
    }
    const dispatcher: MLKafkaAuditDispatcher = new MLKafkaAuditDispatcher(producerOptions, TOPIC_NAME)
    await dispatcher.start()
    auditClient = new MLAuditClient(dispatcher)

    // Server
    processor = new MLConsoleAuditProcessor();
    auditServer = new MLAuditServer(processor, logger);
  })

  afterAll(async () => {
    // Cleanup
    await auditClient.destroy()
    await auditServer.destroy()
  })

  test('produce and consume audit-bc using kafka', async () => {
    consumerOptions = {
      kafkaBrokerList: 'localhost:9092',
      kafkaGroupId: 'test_consumer_group',
      outputType: MLKafkaConsumerOutputType.Json
    }

    //TODO Move the AuditConsumer to the Processor.
    await auditServer.init(new MLKafkaAuditConsumer(
        consumerOptions,
        TOPIC_NAME,
        logger,
        auditServer.processAuditMessage
    ));//Startup consumer...

    await auditClient.audit([sampleAE])

    await expect(processor.getEntryCount() > 0)
  })
})

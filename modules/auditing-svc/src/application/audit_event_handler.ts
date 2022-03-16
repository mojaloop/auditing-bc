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

import {AuditEntry} from "@mojaloop/auditing-bc-auditing-types-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {MLKafkaConsumer, MLKafkaConsumerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

//Since the engine/processor will not be dynamic.
export interface IStorage {
  store(entries: AuditEntry[]): Promise<void>
  init () : Promise<void>
}

export class MLAuditEventHandler {
  private storage : IStorage;
  private logger: ILogger;
  private consumerOpts : MLKafkaConsumerOptions
  private kafkaTopic : string
  private kafkaConsumer : MLKafkaConsumer;

  constructor(
      logger: ILogger,
      storage : IStorage,
      consumerOpts: MLKafkaConsumerOptions,
      kafkaTopic : string
  ) {
    this.logger = logger;
    this.storage = storage;
    this.consumerOpts = consumerOpts;
    this.kafkaTopic = kafkaTopic;
  }

  async init () : Promise<void> {
    await this.storage.init()

    this.kafkaConsumer = new MLKafkaConsumer(this.consumerOpts, this.logger);
    this.kafkaConsumer.setTopics([this.kafkaTopic]);
    this.kafkaConsumer.setCallbackFn(this.processAuditMessage.bind(this));
    await this.kafkaConsumer.connect();
    await this.kafkaConsumer.start();
  }

  async processAuditMessage (message: IMessage) : Promise<void> {
    const value = message.value;

    let auditEntries: AuditEntry[] = [];
    if (typeof value == 'object') {
      auditEntries.push(value as AuditEntry);
    } else {
      this.logger.error('Unable to process value ['+value+'] of type ['+(typeof value)+'].');
      return Promise.resolve(undefined);
    }

    if (auditEntries == undefined || auditEntries.length == 0) return Promise.resolve(undefined);

    return await this.storage.store(auditEntries);
  }

  async destroy () : Promise<void> {
    return this.kafkaConsumer.destroy(true)
  }
}

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

import {IAuditConsumer} from "./audit_server";
import {MLKafkaConsumerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib/dist/rdkafka_consumer";
import {MLKafkaConsumer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {IMessage} from "@mojaloop/platform-shared-lib-messaging-types-lib";

export class MLKafkaAuditConsumer implements IAuditConsumer {
  private logger : ILogger;
  private kafkaConsumer : MLKafkaConsumer;
  private kafkaTopic : string;
  private callbackFn : (message: IMessage) => Promise<void>;

  constructor(
      options: MLKafkaConsumerOptions,
      kafkaTopic : string,
      logger: ILogger,
      callback : (message: IMessage) => Promise<void>
  ) {
    this.logger = logger;
    this.kafkaTopic = kafkaTopic;
    this.callbackFn = callback;
    this.kafkaConsumer = new MLKafkaConsumer(options, logger);
  }

  async init(): Promise<void> {
    this.kafkaConsumer.setCallbackFn(this.callbackFn)//TODO this needs to be better.
    this.kafkaConsumer.setTopics([this.kafkaTopic])
    await this.kafkaConsumer.connect()
    await this.kafkaConsumer.start()

    return Promise.resolve(undefined);
  }

  destroy(): Promise<void> {
    return this.kafkaConsumer.destroy(false)
  }
}

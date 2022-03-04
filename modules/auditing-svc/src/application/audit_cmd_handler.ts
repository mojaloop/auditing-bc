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
import {ConsoleLogger, ILogger} from "@mojaloop/logging-bc-logging-client-lib";
import {MLKafkaEventHandler} from "./kafka_audit_evt_handler";
import {MLKafkaConsumerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

//Since the engine/processor will not be dynamic.
export interface IStorage {
  store(entries: AuditEntry[]): Promise<void>
}

export interface IAuditEventHandler {
  init(): Promise<void>
  destroy(): Promise<void>
}

export class MLAuditCommandHandler {
  private storage : IStorage;
  private eventHandler : IAuditEventHandler;
  private logger: ILogger;
  private consumerOpts : MLKafkaConsumerOptions
  private kafkaTopic : string

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

  init () : Promise<void> {
    this.eventHandler = new MLKafkaEventHandler(
        this.consumerOpts,
        this.kafkaTopic,
        this.logger,
        this.processAuditMessage
    );
    return this.eventHandler.init()
  }

  processAuditMessage (message: IMessage) : Promise<void> {
    const value = message.value;
    let auditEntries: AuditEntry[] = [];
    if (typeof value == "string") {
      auditEntries = JSON.parse(value);
    } else {
      this.logger.error('Unable to process value ['+value+'] of type ['+(typeof value)+'].');
      return Promise.resolve(undefined);
    }

    return this.storage.store(auditEntries);
  }

  destroy () : Promise<void> {
    return this.eventHandler.destroy()
  }
}

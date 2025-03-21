/* istanbul ignore file */
/*****
License
--------------
Copyright © 2020-2025 Mojaloop Foundation
The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Contributors
--------------
This is the official list of the Mojaloop project contributors for this file.
Names of the original copyright holders (individuals or organizations)
should be listed with a '*' in the first column. People who have
contributed from an organization can be listed under the organization
that actually holds the copyright for their contributions (see the
Mojaloop Foundation for an example). Those individuals should have
their names indented and be marked with a '-'. Email address can be added
optionally within square brackets <email>.

* Mojaloop Foundation
- Name Surname <name.surname@mojaloop.io>

* Coil
- Jason Bruwer <jason.bruwer@coil.com>
*****/

"use strict";


import {SignedSourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";
import {IRawMessage, MLKafkaRawProducer, MLKafkaRawProducerOptions} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

import {IAuditClientDispatcher} from "./interfaces";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class KafkaAuditClientDispatcher implements IAuditClientDispatcher {
    private _kafkaProducer: MLKafkaRawProducer;
    private _kafkaTopic: string;
    private _logger: ILogger;

    constructor(producerOptions: MLKafkaRawProducerOptions, kafkaTopic: string, logger: ILogger) {
        this._kafkaTopic = kafkaTopic;
        this._logger = logger.createChild(this.constructor.name);
        this._kafkaProducer = new MLKafkaRawProducer(producerOptions, this._logger);
    }

    async init(): Promise<void> {
        await this._kafkaProducer.connect();
    }

    async destroy(): Promise<void> {
        await this._kafkaProducer.destroy();
    }

    async dispatch(entries: SignedSourceAuditEntry[]): Promise<void> {
        const msgs: IRawMessage[] = [];

        for (const itm of entries) {
            msgs.push({
                topic: this._kafkaTopic,
                value: itm,
                key: null,
                timestamp: Date.now(),
                headers: null,
                partition: null,
                offset: null
                // headers: [
                //   { key1: Buffer.from('testStr') }
                // ]
            });
        }

        await this._kafkaProducer.send(msgs);
    }
}

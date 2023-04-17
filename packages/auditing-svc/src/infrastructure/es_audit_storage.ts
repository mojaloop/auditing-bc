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

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Client} from "@elastic/elasticsearch";
import {ClientOptions} from "@elastic/elasticsearch/lib/client";
import {IAuditRepo} from "../domain/domain_interfaces";
import {SignedCentralAuditEntry} from "../domain/server_types";

export class ElasticsearchAuditStorage implements IAuditRepo {
  private _client: Client;
  private readonly _clientOps: ClientOptions;
  private readonly _index: string;
  private _logger: ILogger;

  constructor(opts: ClientOptions, index: string, logger:ILogger) {
    this._clientOps = opts;
    this._index = index;
    this._logger = logger.createChild(this.constructor.name);
    this._client = new Client(this._clientOps);
  }

  async init(): Promise<void> {
    this._logger.info("ElasticsearchAuditStorage initialised");

    // test the connection
    const info = await this._client.info();
    this._logger.info(`Connected to elasticsearch instance with name: ${info.name}, and cluster name: ${info.cluster_name}`);
  }

  async destroy(): Promise<void> {
    await this._client.close();
    return Promise.resolve();
  }


  async store(entry:SignedCentralAuditEntry): Promise<void>{
    try {
        await this._client.index({
          index: this._index,
          document: entry
        });
    } catch (err) {
      this._logger.error("ElasticsearchAuditStorage error", err);
    }
  }
}

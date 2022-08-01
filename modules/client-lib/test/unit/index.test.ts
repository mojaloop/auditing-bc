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

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>

 --------------
 ******/

"use strict"


import {
    AuditClient,
    IAuditClientCryptoProvider,
    IAuditClientDispatcher, KafkaAuditClientDispatcher,
    LocalAuditClientCryptoProvider,
} from "../../src/";

import {ConsoleLogger, LogLevel} from "@mojaloop/logging-bc-public-types-lib";
import {AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {MockAuditClientDispatcher} from "./mock_audit_dispatcher";

const BC_NAME = "logging-bc";
const APP_NAME = "client-lib";
const APP_VERSION = "0.0.1";
const LOGLEVEL = LogLevel.TRACE;
const KAFKA_AUDIT_TOPIC = "audits";


const logger = new ConsoleLogger();
let auditClient: AuditClient;
let cryptoProvider: IAuditClientCryptoProvider;
let auditDispatcher: IAuditClientDispatcher;
const secCtx: AuditSecurityContext = {
    userId: "userid",
    appId: null,
    role: "role"
}

describe('test audit client with mock dispatcher', () => {

    beforeAll(async ()=>{
        LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync("../tmp_key_file", 2048);
        cryptoProvider = new LocalAuditClientCryptoProvider("../tmp_key_file");

        auditDispatcher= new MockAuditClientDispatcher();
        auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);

        await auditClient.init();
    });

    test("test send audit entry", async () => {
        await auditClient.audit("testAction", true, secCtx);
    })
})

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
    IAuditClientDispatcher,
    LocalAuditClientCryptoProvider,
} from "../../src/";

import {ConsoleLogger} from "@mojaloop/logging-bc-public-types-lib";
import {AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {MockAuditClientDispatcher} from "./mock_audit_dispatcher";
import {existsSync, unlinkSync} from "fs";
import path from "path";

const BC_NAME = "logging-bc";
const APP_NAME = "client-lib";
const APP_VERSION = "0.0.1";


const logger = new ConsoleLogger();
let auditClient: AuditClient;
let cryptoProvider: IAuditClientCryptoProvider;
let auditDispatcher: IAuditClientDispatcher;
const secCtx: AuditSecurityContext = {
    userId: "userid",
    appId: null,
    role: "role"
};

const TMP_KEY_FILE_PATH = path.join(__dirname, "tmp_key_file_client_lib.pem");

describe("test audit client with mock dispatcher", () => {

    beforeAll(async ()=>{
        if(!existsSync(TMP_KEY_FILE_PATH)) {
            LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(TMP_KEY_FILE_PATH, 2048);
        }
        cryptoProvider = new LocalAuditClientCryptoProvider(TMP_KEY_FILE_PATH);



        auditDispatcher= new MockAuditClientDispatcher();
        auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);

        await auditClient.init();
    });

    afterAll(async ()=>{
        if(existsSync(TMP_KEY_FILE_PATH)) {
            // delete the key file
            unlinkSync(TMP_KEY_FILE_PATH);
        }
        await cryptoProvider.destroy();
        await auditClient.destroy();
    });

    test("test send audit entry", async () => {
        await auditClient.audit("testAction0", true, secCtx, [{key: "key", value:"value", encryptionKeyId: "1"}]);
        await auditClient.audit("testAction1", true, secCtx);
        await auditClient.audit("testAction2", false);
    });


    test("test create createRsaPrivateKeyFileSync", async () => {
        // using undefined key size to test the other branch
        LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(TMP_KEY_FILE_PATH);
    });
});

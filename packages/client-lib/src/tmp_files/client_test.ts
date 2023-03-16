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

/* istanbul ignore file */

import { ILogger, LogLevel, ConsoleLogger } from "@mojaloop/logging-bc-public-types-lib";
import {AuditSecurityContext, SourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";
import {AuditClient} from "../";
import {IAuditClientDispatcher, IAuditClientCryptoProvider} from "../";
import {LocalAuditClientCryptoProvider} from "../";
import {KafkaAuditClientDispatcher} from "../";
import {readFileSync} from "fs";
import crypto from "crypto";


const BC_NAME = "logging-bc";
const APP_NAME = "client-lib";
const APP_VERSION = "0.0.1";
const LOGLEVEL = LogLevel.TRACE;
const KAFKA_AUDIT_TOPIC = "audits";

const kafkaProducerOptions = {
    kafkaBrokerList: "localhost:9092"
};

const logger = new ConsoleLogger();
let auditClient: AuditClient;

async function start() {
    const cryptoProvider: IAuditClientCryptoProvider = new LocalAuditClientCryptoProvider("../../test_keys/3_private.pem");
    const kafkaDispatcher: IAuditClientDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDIT_TOPIC, logger);

    auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, kafkaDispatcher);

    await auditClient.init();

    const secCtx: AuditSecurityContext = {
        userId: "userid",
        appId: null,
        role: "role"
    };

    await auditClient.audit("testAction", true, secCtx);
    // debugger;
}

async function testVerification(){
    // test verification
    const sourceAuditEntry = {
        "id": "4cba440d-677d-4ab6-9482-69246fb3384b",
        "actionTimestamp": 1654799079205,
        "sourceBcName": "logging-bc",
        "sourceAppName": "client-lib",
        "sourceAppVersion": "0.0.2",
        "callerNetworkSources": [
            {
                "family": "IPv4",
                "address": "192.168.1.94"
            },
            {
                "family": "IPv4",
                "address": "192.168.1.63"
            },
            {
                "family": "IPv6",
                "address": "2001:8a0:7f70:4601:7a5c:bc75:5d71:9a95"
            },
            {
                "family": "IPv6",
                "address": "2001:8a0:7f70:4601:199b:2470:d60:6f1e"
            },
            {
                "family": "IPv6",
                "address": "2001:8a0:7f70:4601:be75:307:6fc6:a130"
            },
            {
                "family": "IPv6",
                "address": "fe80::e482:2766:2928:2f83"
            },
            {
                "family": "IPv4",
                "address": "172.20.0.1"
            },
            {
                "family": "IPv6",
                "address": "fe80::42:a9ff:fe0c:e8bb"
            },
            {
                "family": "IPv4",
                "address": "172.17.0.1"
            },
            {
                "family": "IPv6",
                "address": "fe80::42:ddff:fe1c:101e"
            },
            {
                "family": "IPv6",
                "address": "fe80::fc54:ff:feb2:f696"
            },
            {
                "family": "IPv6",
                "address": "fe80::fc54:ff:fead:b3a1"
            },
            {
                "family": "IPv6",
                "address": "fe80::d071:7cff:fe6c:181d"
            },
            {
                "family": "IPv6",
                "address": "fe80::58da:bbff:fe3f:a8f9"
            },
            {
                "family": "IPv6",
                "address": "fe80::ecf5:72ff:fed7:d8e4"
            },
            {
                "family": "IPv6",
                "address": "fe80::b4c6:45ff:fe97:9d29"
            },
            {
                "family": "IPv6",
                "address": "fe80::f8e5:3bff:fe7c:307f"
            },
            {
                "family": "IPv6",
                "address": "fe80::b427:b0ff:fe1b:e54"
            }
        ],
        "securityContext": {
            "userId": "userid",
            "appId": null,
            "role": "role"
        },
        "actionType": "testAction",
        "actionSuccessful": true,
        "labels": [],
        "sourceKeyId": "6a724897fbd003680795376d4d3f5345446653bf"
    };
    const sourceSignature ="jwocKL7dAhHnJQQ1115mkVy7lTuC+x4iwFr9Wjy2+cQC6hlB05r14xcugOFQGQ2jgawXOxADYwTWKWP0OlHmYZB9T2SSPuV0uiS910/nuCD2qtGSxIWXLXbvVKAjzfQ49rHB0uS0W4rqo4uqKnkI8GIBh0EQj9NagxaSs3oG70GiAABc+7N7E4EIGVdb9bgMFsCAvAi7cYS5SS0+PJGyJp7eZswdrQkR9aqZDrrhR/1q21QJEho2vc/xFGg/+oHqNvt5YVYa+cNCPNqBenitNaC4l9tgNnvI04AezQQHKc/Nl0AsxAAGvz2+f9ewrhR+bNhdqenw7DAdORcdteXGVA==";

    const publicKey = readFileSync("./test_keys/3_public.pem");
    const publicKeyObj = crypto.createPublicKey(publicKey);
    const pubKeyDER = publicKeyObj.export({ type: "spki", format: "der" });
    const keyFingerprint = crypto.createHash("sha1").update(pubKeyDER).digest("hex");

    if(keyFingerprint !== sourceAuditEntry.sourceKeyId){
        // debugger;
    }

    const objStr = JSON.stringify(sourceAuditEntry);
    const verified = crypto.createVerify("sha1").update(objStr).end().verify(publicKey, Buffer.from(sourceSignature, "base64"));

}


start().then(async ()=>{
    await auditClient.destroy();
});
//testVerification().then();

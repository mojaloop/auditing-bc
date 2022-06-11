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


import {readFileSync} from "fs";
import crypto from "crypto";
import {IAuditClientCryptoProvider} from "./audit_client";

export class TestAuditClientCryptoProvider implements IAuditClientCryptoProvider{
    private _privateKeyPath: string;
    private _privateKey: Buffer;
    private _privateKeyObj: crypto.KeyObject;
    private _publicKeyObj: crypto.KeyObject;



    constructor(privateKeyPath:string){
        this._privateKeyPath = privateKeyPath;
    }

    init(): Promise<void> {
        this._privateKey =  readFileSync(this._privateKeyPath);

        this._privateKeyObj =  crypto.createPrivateKey(this._privateKey);
        this._publicKeyObj = crypto.createPublicKey(this._privateKey);

        return Promise.resolve(undefined);
    }

    destroy(): Promise<void> {
        return Promise.resolve(undefined);
    }

    getSha1Signature(strData: string): Promise<string> {
        const signature = crypto.createSign("sha1").update(strData).end().sign(this._privateKey).toString("base64");
        console.log("[Crypto] getSha1Signature() - Signature (Base64): ", signature);
        return Promise.resolve(signature);
    }

    getPubKeyFingerprint(): Promise<string> {
        const pubKeyDER = this._publicKeyObj.export({type: "spki", format: "der"});
        const fingerprint = crypto.createHash("sha1").update(pubKeyDER).digest("hex");
        console.log(`[Crypto] - getPubKeyFingerprint() - Public Key Fingerprint: ${fingerprint}\n`);

        return Promise.resolve(fingerprint);
    }
}

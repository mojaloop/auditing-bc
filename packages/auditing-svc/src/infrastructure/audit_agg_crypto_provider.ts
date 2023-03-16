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

"use strict";

import {IAuditAggregateCryptoProvider} from "../domain/domain_interfaces";
import { SourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";
import crypto from "crypto";
import {readFileSync, writeFileSync} from "fs";
import {ILogger} from "@mojaloop/logging-bc-public-types-lib";

export class AuditAggregateCryptoProvider implements IAuditAggregateCryptoProvider{
    private _logger: ILogger;
    private _privateKeyPath: string;
    private _privateKey: Buffer;
    private _privateKeyObj: crypto.KeyObject;
    private _publicKeyObj: crypto.KeyObject;
    private _pubKeyDER: Buffer;

    constructor(privateKeyPath:string, logger: ILogger){
        this._privateKeyPath = privateKeyPath;
        this._logger = logger.createChild((this as any).constructor.name);
    }

    async init(): Promise<void> {
        this._privateKey =  readFileSync(this._privateKeyPath);

        this._privateKeyObj =  crypto.createPrivateKey(this._privateKey);
        this._publicKeyObj = crypto.createPublicKey(this._privateKey);
        this._pubKeyDER = this._publicKeyObj.export({ type: "spki", format: "der" });

        const keyFingerprint = await this.getPubKeyFingerprint();
        this._logger.info(`AuditAggregateCryptoProvider initialised, with key at: ${this._privateKeyPath} and pub key: ${keyFingerprint}`);

        return Promise.resolve();
    }

    destroy(): Promise<void> {
        return Promise.resolve();
    }


    getPubKeyFingerprint(): Promise<string> {
        const pubKeyDER = this._publicKeyObj.export({type: "spki", format: "der"});
        const fingerprint = crypto.createHash("sha1").update(pubKeyDER).digest("hex");
        this._logger.debug(`getPubKeyFingerprint() - Public Key Fingerprint: ${fingerprint}\n`);

        return Promise.resolve(fingerprint);
    }

    getSha1Signature(strData: string): Promise<string> {
        const signature = crypto.createSign("sha1").update(strData).end().sign(this._privateKey).toString("base64");
        //console.log("[Crypto] getSha1Signature() - Signature (Base64): ", signature);
        return Promise.resolve(signature);
    }


    async verifySourceSignature(jsonStr:string, sourceKeyId:string, signature:string): Promise<boolean> {
        const keyFingerprint = crypto.createHash("sha1").update(this._pubKeyDER).digest("hex");

        if(keyFingerprint !== sourceKeyId){
            return false;
        }

        const verified = crypto.createVerify("sha1").update(jsonStr).end().verify(this._publicKeyObj, Buffer.from(signature, "base64"));

        return verified;
    }

    static createRsaPrivateKeyFileSync(filePath:string, modulusLength = 2048):void{
        const keyOptions = {
            modulusLength: modulusLength,
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem",
                //cipher: 'aes-256-cbc',   // *optional*
                //passphrase: 'top secret' // *optional*
            }
        };
        const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", keyOptions);
        writeFileSync(filePath, Buffer.from(privateKey.toString()));
    }

}

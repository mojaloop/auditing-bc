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

import { SourceAuditEntry } from "@mojaloop/auditing-bc-public-types-lib";

import {AuditSearchResults, SignedCentralAuditEntry} from "./server_types";

export interface IAuditRepo{
    init():Promise<void>;
    destroy():Promise<void>;
    store(entries:SignedCentralAuditEntry[]): Promise<void>;

    searchEntries(
        // text:string|null,
        userId:string|null,
        sourceBcName:string|null,
        sourceAppName:string|null,
        actionType:string|null,
        actionSuccessful:boolean|null,
        startDate:number|null,
        endDate:number|null,
        pageIndex?:number,
        pageSize?: number
    ): Promise<AuditSearchResults>;

    getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>
}


export interface IAuditAggregateCryptoProvider{
    init():Promise<void>;
    destroy():Promise<void>;

    // fetchAppPublicKey(bcName:string, appName:string, appVersion:string):Promise<KeyObject>;
    // verifySourceSignature(entry:SignedCentralAuditEntry, pubKey:KeyObject): Promise<void>;

    // this should be able to fetch the correct pub key and verify the sig
    verifySourceSignature(jsonStr:string, sourceKeyId:string, signature:string): Promise<boolean>;

    getSha1Signature(strData:string):Promise<string>;
    getPubKeyFingerprint():Promise<string>;
}

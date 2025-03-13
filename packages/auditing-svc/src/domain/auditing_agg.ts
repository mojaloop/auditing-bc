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

* Crosslake
- Pedro Sousa Barreto <pedrob@crosslaketech.com>
*****/

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {IAuditRepo, IAuditAggregateCryptoProvider} from "./domain_interfaces";
import {SignedSourceAuditEntry, SourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";
import {CentralAuditEntry, SignedCentralAuditEntry} from "./server_types";
import {IRawMessage} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";

const INVALID_SIGNATURE_STR = "INVALID";

export class AuditingAggregate{
    private _bcName: string;
    private _appName: string;
    private _appVersion: string;
    private _logger: ILogger;
    private _repo: IAuditRepo;
    private _cryptProvider: IAuditAggregateCryptoProvider;
    private _ownPubKeyfingerprint: string = INVALID_SIGNATURE_STR;

    constructor(bcName: string, appName: string, appVersion: string, repo: IAuditRepo, cryptProvider: IAuditAggregateCryptoProvider, logger: ILogger) {
        this._bcName = bcName;
        this._appName = appName;
        this._appVersion = appVersion;
        this._repo = repo;
        this._cryptProvider = cryptProvider;
        this._logger = logger.createChild((this as any).constructor.name);
    }

    async init():Promise<void>{
        // let it break if it throws; svc shouldn't start without it
        this._ownPubKeyfingerprint = await this._cryptProvider.getPubKeyFingerprint();
    }

    async processMessages(messages: IRawMessage[]):Promise<void> {
        const entries: SignedCentralAuditEntry[] = [];

        for(const msg of messages){
            const entry = await this._processSignedSourceAuditEntry(msg.value as SignedSourceAuditEntry );
            entries.push(entry);
        }

        try {
            await this._repo.store(entries);
        }catch(err){
            this._logger.error(err);
        }
    }

    private _getSourceEntryFromSignedSourceEntry(signedSourceEntry:SignedSourceAuditEntry):SourceAuditEntry{
        // remove sourceSignature prop from signed object
        const {sourceSignature, ...sourceEntry} = signedSourceEntry;
        return sourceEntry;
    }

    private async _isSignedSourceAuditEntryVerified(entry: SignedSourceAuditEntry):Promise<boolean>{
        try {
            const sourceEntry = this._getSourceEntryFromSignedSourceEntry(entry);
            const jsonString = JSON.stringify(sourceEntry);
            const sourceSigIsVerified = await this._cryptProvider.verifySourceSignature(
                jsonString,
                sourceEntry.sourceKeyId,
                entry.sourceSignature
            );
            return sourceSigIsVerified;
        }catch(err){
            this._logger.error(err); // log but continue
            return false;
        }
    }

    private async _processSignedSourceAuditEntry(signedSourceEntry:SignedSourceAuditEntry):Promise<SignedCentralAuditEntry>{
        const sourceSigVerified = await this._isSignedSourceAuditEntryVerified(signedSourceEntry);

        const centralAuditEntry:CentralAuditEntry = {
            ...signedSourceEntry,
            invalidSourceSignature: !sourceSigVerified,
            persistenceTimestamp: Date.now(),
            auditingSvcAppName: this._appName,
            auditingSvcAppVersion: this._appVersion,
            auditingSvcKeyId: this._ownPubKeyfingerprint
        };

        let svcSignature = INVALID_SIGNATURE_STR;
        try{
            svcSignature = await this._cryptProvider.getSha1Signature(JSON.stringify(centralAuditEntry));
        }catch(err){
            this._logger.error(err); // log but continue
        }

        const finalEntry : SignedCentralAuditEntry ={
            ...centralAuditEntry,
            auditingSvcSignature: svcSignature
        };

        return finalEntry;
    }
}

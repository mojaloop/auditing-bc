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
import * as Crypto from "crypto";
import {
    AuditEntryLabel, AuditSecurityContext,
    IAuditClient, NetworkSource,
    SignedSourceAuditEntry,
    SourceAuditEntry
} from "@mojaloop/auditing-bc-public-types-lib";
import os, {NetworkInterfaceInfo} from "os";
import {IAuditClientCryptoProvider, IAuditClientDispatcher} from "./interfaces";


export class AuditClient implements IAuditClient {
    protected _bcName: string;
    protected _appName: string;
    protected _appVersion: string;
    private _cryptoProvider: IAuditClientCryptoProvider;
    private _dispatcher: IAuditClientDispatcher;
    private _netSources: NetworkSource[];

    constructor(bcName: string, appName: string, appVersion: string, cryptoProvider: IAuditClientCryptoProvider, dispatcher: IAuditClientDispatcher) {
        this._bcName = bcName;
        this._appName = appName;
        this._appVersion = appVersion;
        this._cryptoProvider = cryptoProvider;
        this._dispatcher = dispatcher;

        /* istanbul ignore next */
        this._netSources = Object.values(os.networkInterfaces())
            .flat()
            .filter((value: NetworkInterfaceInfo | undefined) => value && (value.family==="IPv4" || value.family==="IPv6") && !value.internal)
            .map((value: NetworkInterfaceInfo | undefined) => {
                return {family: value!.family, address: value!.address};
            });
    }

    async init(): Promise<void> {
        await this._cryptoProvider.init();
        await this._dispatcher.init();
        return Promise.resolve(undefined);
    }

    async destroy(): Promise<void> {
        await this._dispatcher.destroy();
        await this._cryptoProvider.destroy();
        return Promise.resolve(undefined);
    }

    private _createEntry(actionType: string, actionSuccessful: boolean, securityContext?: AuditSecurityContext, labels?: AuditEntryLabel[]): SourceAuditEntry {
        const secCtx: AuditSecurityContext = securityContext || {
            userId: null,
            appId: null,
            role: null
        };

        const entry: SourceAuditEntry = {
            id: Crypto.randomUUID(),
            actionTimestamp: Date.now(),

            sourceBcName: this._bcName,
            sourceAppName: this._appName,
            sourceAppVersion: this._appVersion,

            callerNetworkSources: this._netSources,

            securityContext: secCtx,

            actionType: actionType,
            actionSuccessful: actionSuccessful,
            labels: labels || [],
            sourceKeyId: ""
        };
        return entry;
    }

    private async _signEntry(entry: SourceAuditEntry): Promise<SignedSourceAuditEntry> {
        try {
            entry.sourceKeyId = await this._cryptoProvider.getPubKeyFingerprint();
        } catch (err) {
            // TODO log err
            /* istanbul ignore next */
            throw new Error("Cannot get public key fingerprint from IAuditClientCryptoProvider");
        }

        let signature: string;
        try {
            signature = await this._cryptoProvider.getSha1Signature(JSON.stringify(entry));
        } catch (err) {
            // TODO log err
            /* istanbul ignore next */
            throw new Error("Cannot get sha1 signature from IAuditClientCryptoProvider");
        }

        return {
            ...entry,
            sourceSignature: signature
        };
    }


    async audit(actionType: string, actionSuccessful: boolean, securityContext?: AuditSecurityContext, labels?: AuditEntryLabel[]): Promise<void> {
        const entry = this._createEntry(actionType, actionSuccessful, securityContext, labels);
        const signedEntry: SignedSourceAuditEntry = await this._signEntry(entry);
        await this._dispatcher.dispatch([signedEntry]);
    }

   /* async auditMany(entries: SourceAuditEntry[]): Promise<void> {
        const signedEntries: SignedSourceAuditEntry[] = [];
        for (const entry of entries) {
            signedEntries.push(await this._signEntry(entry));
        }
        await this._dispatcher.dispatch(signedEntries);
    }*/
}

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

import {SignedSourceAuditEntry} from "@mojaloop/auditing-bc-public-types-lib";

/*************
 *
 * Server/Central types
 *
 **************/


// central audit record with central metadata and key id
export declare type CentralAuditEntry = SignedSourceAuditEntry & {
    invalidSourceSignature: boolean;            // invalid source sig detected by central auditing service
    persistenceTimestamp: number;               // unix timestamp of the persistence
    auditingSvcAppName: string;
    auditingSvcAppVersion: string;

    auditingSvcKeyId: string;
}


// final central audit record, fully signed
export declare type SignedCentralAuditEntry = CentralAuditEntry & {
    auditingSvcSignature: string;
}


export declare type AuditSearchResults = {
    pageSize: number;
    totalPages: number;
    pageIndex: number;
    items: SignedCentralAuditEntry[];
}



/*
// central audit record with central metadata and key id
import {
    AuditEntryLabel,
    NetworkSource,
    AuditSecurityContext,
    SignedSourceAuditEntry
} from "@mojaloop/auditing-bc-public-types-lib";


export declare type CentralAuditEntry = {
    sourceAuditEntry: SignedSourceAuditEntry;   // enveloped audit entry

    invalidSourceSignature: boolean;            // invalid source sig detected by central auditing service
    persistenceTimestamp: number;               // unix timestamp of the persistence
    auditingSvcAppName: string;
    auditingSvcAppVersion: string;

    auditingSvcKeyId: string;
}


// final central audit record, fully signed - this one is expanded before being persisted, so it can be indexed
export declare type SignedCentralAuditEntry = {
    id: string;                                 // uuid
    actionTimestamp: number;                    // original unix timestamp or action

    //functionTransaction: string;              // not clear what this is for; conflict with actionType? leaving out for now

    sourceBcName:string;                        // source bc name, matching platform configuration
    sourceAppName:string;                       // source app name, matching platform configuration
    sourceAppVersion:string;                    // source app version, matching platform configuration

    sourceKeyId: string;                        // this should be inside the envelope, to prevent re-envelope

    callerNetworkSource: NetworkSource;         // caller source address
    securityContext: AuditSecurityContext;      // security principal and the permitting role

    actionType: string;                         // action executed (actions are per BC action)
    actionSuccessful: boolean;                  // was the executed action successful

    // metaTrackingInfo: MetaTrackingInfo[]     // should come from the platform-monitoring-bc
    labels: AuditEntryLabel[];                  // additional K/V labels that can be encrypted values

    // source sig
    sourceSignature: string;                    // audit entry signature

    // auditing metadata
    persistenceTimestamp: number;               // unix timestamp of the persistence
    auditingSvcAppName: string;
    auditingSvcAppVersion: string;
    auditingSvcKeyId: string;

    auditingSvcSignature: string;
}
*/

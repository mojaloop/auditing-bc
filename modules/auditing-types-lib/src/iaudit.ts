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

'use strict'

export declare type SecurityContext = {
  token: string
  role: string
}

export declare enum ActionType {
  participants_lifecycle_bc,
  transfer_bc,
  settlement_bc,
  accounts_and_balances_bc
}

export declare type MetaTrackingInfo = {
  traceId: string
  parentId: string
  spanId: string
}

export declare type AuditEntryLabel = {
  key: string
  value: string
  encryptionKeyId: string
}

export declare type AuditEntry = {
  id: bigint
  originalTimestamp: bigint
  persistenceTimestamp: bigint
  functionTransaction: string
  sourceBCSystemId: string
  sourceBCId: string
  sourceBCSignature: Buffer
  sourceBCKeyId: string
  sourceBCNetworkIdentifiers: string[]
  securityContext: SecurityContext[]
  actionType: ActionType
  success: boolean
  metaTrackingInfo: MetaTrackingInfo[]
  labels: AuditEntryLabel[]
}

export type IAudit = {
  // methods to confirm auditing is enabled
  isAuditEnabled: () => boolean

  // methods to handle audit
  audit: (auditEntries: AuditEntry[]) => void

  // retrieving audit entries
  getAuditEntriesBy: (
      fromDate: bigint,
      toDate: bigint,
      actionTypes: ActionType[],
      offset: bigint,
      limit: number
  ) => AuditEntry[]
}

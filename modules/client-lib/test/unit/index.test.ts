"use strict"

import { AuditEntry } from '@mojaloop/auditing-bc-public-types-lib'
import { MLConsoleAuditDispatcher } from "../../src/mock_audit_dispatcher"
import { MLAuditClient } from "../../src/audit_client"

let auditClient : MLAuditClient

const sampleAE: AuditEntry = {
  'id' : 1,
  'originalTimestamp' : Date.now(),
  'persistenceTimestamp' : Date.now(),
  'functionTransaction' : 'fc',
  'sourceBCSystemId' : 'audit-bc-sys',
  'sourceBCId' : 'audit-bc',
  'sourceBCSignature' : Buffer.from('audit-bc-sig'),
  'sourceBCKeyId' : 'audit-bc-key',
  'sourceBCNetworkIdentifiers' : [],
  'securityContext' : [],
  'actionType' : 'persist-audit',
  'success' : true,
  'metaTrackingInfo' : [],
  'labels' : []
}

describe('test audit client with mock dispatcher', () => {

  beforeEach(async () => {
    // Setup
    const dispatcher: MLConsoleAuditDispatcher = new MLConsoleAuditDispatcher()
    auditClient = new MLAuditClient(dispatcher)
  })

  afterEach(async () => {
    // Cleanup
    auditClient.destroy()
  })

  test('should goes here', async () => {
    auditClient.audit([sampleAE])
    //await expect(true)
  })
})

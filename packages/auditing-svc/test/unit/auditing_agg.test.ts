import { AuditingAggregate } from '../../src/domain/auditing_agg';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { IAuditRepo, IAuditAggregateCryptoProvider } from '../../src/domain/domain_interfaces';
import { IRawMessage } from '@mojaloop/platform-shared-lib-nodejs-kafka-client-lib';
import { SignedSourceAuditEntry } from '@mojaloop/auditing-bc-public-types-lib';

describe('AuditingAggregate', () => {
  let mockLogger: ILogger;
  let mockRepo: jest.Mocked<IAuditRepo>;
  let mockCryptoProvider: jest.Mocked<IAuditAggregateCryptoProvider>;
  let aggregate: AuditingAggregate;

  const bcName = 'TestBC';
  const appName = 'TestApp';
  const appVersion = '1.0.0';
  const ownPubKeyFingerprint = 'ownPubKeyFingerprint';

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      isInfoEnabled: jest.fn().mockReturnValue(true),
      isDebugEnabled: jest.fn().mockReturnValue(true),
      isErrorEnabled: jest.fn().mockReturnValue(true),
      isWarnEnabled: jest.fn().mockReturnValue(true),
      isTraceEnabled: jest.fn().mockReturnValue(true),
      isFatalEnabled: jest.fn().mockReturnValue(true),
      createChild: jest.fn().mockReturnThis(),
    } as unknown as ILogger;

    // Mock Repo
    mockRepo = {
      init: jest.fn(),
      destroy: jest.fn(),
      store: jest.fn(),
      searchEntries: jest.fn(),
      getSearchKeywords: jest.fn(),
    } as unknown as jest.Mocked<IAuditRepo>;

    // Mock Crypto Provider
    mockCryptoProvider = {
      init: jest.fn(),
      destroy: jest.fn(),
      getPubKeyFingerprint: jest.fn().mockResolvedValue(ownPubKeyFingerprint),
      getSha1Signature: jest.fn(),
      verifySourceSignature: jest.fn(),
    } as unknown as jest.Mocked<IAuditAggregateCryptoProvider>;

    // Instantiate the aggregate
    aggregate = new AuditingAggregate(bcName, appName, appVersion, mockRepo, mockCryptoProvider, mockLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should initialize and get own public key fingerprint', async () => {
    // Act
    await aggregate.init();

    // Assert
    expect(mockCryptoProvider.getPubKeyFingerprint).toHaveBeenCalled();
  });

  test('should process messages successfully', async () => {
    // Arrange
    await aggregate.init();

    const signedSourceAuditEntry: SignedSourceAuditEntry = {
      id: 'entry1',
      actionTimestamp: Date.now(),
      sourceBcName: 'bc1',
      sourceAppName: 'app1',
      sourceAppVersion: '1.0.0',
      sourceKeyId: 'sourceKeyId',
      callerNetworkSources: [
        {
          family: 'IPv4',
          address: '127.0.0.1',
        },
      ],
      securityContext: {
        userId: 'user1',
        appId: 'app1',
        role: 'admin',
      },
      actionType: 'action1',
      actionSuccessful: true,
      labels: [
        {
          key: 'label1',
          value: 'value1',
        },
      ],
      sourceSignature: 'sourceSignature',
    };

    const rawMessage: IRawMessage = {
      value: signedSourceAuditEntry,
    } as IRawMessage;

    mockCryptoProvider.verifySourceSignature.mockResolvedValue(true);
    mockCryptoProvider.getSha1Signature.mockResolvedValue('svcSignature');

    // Act
    await aggregate.processMessages([rawMessage]);

    // Assert
    expect(mockCryptoProvider.verifySourceSignature).toHaveBeenCalled();
    expect(mockCryptoProvider.getSha1Signature).toHaveBeenCalled();
    expect(mockRepo.store).toHaveBeenCalledWith([
      expect.objectContaining({
        invalidSourceSignature: false,
        auditingSvcSignature: 'svcSignature',
      }),
    ]);
  });

  test('should mark entry as invalid when source signature verification fails', async () => {
    // Arrange
    await aggregate.init();

    const signedSourceAuditEntry: SignedSourceAuditEntry = {
      id: 'entry1',
      actionTimestamp: Date.now(),
      sourceBcName: 'bc1',
      sourceAppName: 'app1',
      sourceAppVersion: '1.0.0',
      sourceKeyId: 'sourceKeyId',
      callerNetworkSources: [
        {
          family: 'IPv4',
          address: '127.0.0.1',
        },
      ],
      securityContext: {
        userId: 'user1',
        appId: 'app1',
        role: 'admin',
      },
      actionType: 'action1',
      actionSuccessful: true,
      labels: [
        {
          key: 'label1',
          value: 'value1',
        },
      ],
      sourceSignature: 'invalidSignature',
    };

    const rawMessage: IRawMessage = {
      value: signedSourceAuditEntry,
    } as IRawMessage;

    mockCryptoProvider.verifySourceSignature.mockResolvedValue(false);
    mockCryptoProvider.getSha1Signature.mockResolvedValue('svcSignature');

    // Act
    await aggregate.processMessages([rawMessage]);

    // Assert
    expect(mockCryptoProvider.verifySourceSignature).toHaveBeenCalled();
    expect(mockRepo.store).toHaveBeenCalledWith([
      expect.objectContaining({
        invalidSourceSignature: true,
      }),
    ]);
  });

  test('should handle errors during signature verification', async () => {
    // Arrange
    await aggregate.init();

    const signedSourceAuditEntry: SignedSourceAuditEntry = {
      id: 'entry1',
      actionTimestamp: Date.now(),
      sourceBcName: 'bc1',
      sourceAppName: 'app1',
      sourceAppVersion: '1.0.0',
      sourceKeyId: 'sourceKeyId',
      callerNetworkSources: [
        {
          family: 'IPv4',
          address: '127.0.0.1',
        },
      ],
      securityContext: {
        userId: 'user1',
        appId: 'app1',
        role: 'admin',
      },
      actionType: 'action1',
      actionSuccessful: true,
      labels: [
        {
          key: 'label1',
          value: 'value1',
        },
      ],
      sourceSignature: 'sourceSignature',
    };

    const rawMessage: IRawMessage = {
      value: signedSourceAuditEntry,
    } as IRawMessage;

    const error = new Error('Verification error');
    mockCryptoProvider.verifySourceSignature.mockRejectedValue(error);
    mockCryptoProvider.getSha1Signature.mockResolvedValue('svcSignature');

    // Act
    await aggregate.processMessages([rawMessage]);

    // Assert
    expect(mockCryptoProvider.verifySourceSignature).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(error);
    expect(mockRepo.store).toHaveBeenCalledWith([
      expect.objectContaining({
        invalidSourceSignature: true,
      }),
    ]);
  });

  test('should handle errors during service signature generation', async () => {
    // Arrange
    await aggregate.init();

    const signedSourceAuditEntry: SignedSourceAuditEntry = {
      id: 'entry1',
      actionTimestamp: Date.now(),
      sourceBcName: 'bc1',
      sourceAppName: 'app1',
      sourceAppVersion: '1.0.0',
      sourceKeyId: 'sourceKeyId',
      callerNetworkSources: [
        {
          family: 'IPv4',
          address: '127.0.0.1',
        },
      ],
      securityContext: {
        userId: 'user1',
        appId: 'app1',
        role: 'admin',
      },
      actionType: 'action1',
      actionSuccessful: true,
      labels: [
        {
          key: 'label1',
          value: 'value1',
        },
      ],
      sourceSignature: 'sourceSignature',
    };

    const rawMessage: IRawMessage = {
      value: signedSourceAuditEntry,
    } as IRawMessage;

    const error = new Error('Signature generation error');
    mockCryptoProvider.verifySourceSignature.mockResolvedValue(true);
    mockCryptoProvider.getSha1Signature.mockRejectedValue(error);

    // Act
    await aggregate.processMessages([rawMessage]);

    // Assert
    expect(mockCryptoProvider.getSha1Signature).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(error);
    expect(mockRepo.store).toHaveBeenCalledWith([
      expect.objectContaining({
        auditingSvcSignature: 'INVALID',
      }),
    ]);
  });

  test('should handle errors during storing entries', async () => {
    // Arrange
    await aggregate.init();

    const signedSourceAuditEntry: SignedSourceAuditEntry = {
      id: 'entry1',
      actionTimestamp: Date.now(),
      sourceBcName: 'bc1',
      sourceAppName: 'app1',
      sourceAppVersion: '1.0.0',
      sourceKeyId: 'sourceKeyId',
      callerNetworkSources: [
        {
          family: 'IPv4',
          address: '127.0.0.1',
        },
      ],
      securityContext: {
        userId: 'user1',
        appId: 'app1',
        role: 'admin',
      },
      actionType: 'action1',
      actionSuccessful: true,
      labels: [
        {
          key: 'label1',
          value: 'value1',
        },
      ],
      sourceSignature: 'sourceSignature',
    };

    const rawMessage: IRawMessage = {
      value: signedSourceAuditEntry,
    } as IRawMessage;

    const error = new Error('Store error');
    mockCryptoProvider.verifySourceSignature.mockResolvedValue(true);
    mockCryptoProvider.getSha1Signature.mockResolvedValue('svcSignature');
    mockRepo.store.mockRejectedValue(error);

    // Act
    await aggregate.processMessages([rawMessage]);

    // Assert
    expect(mockRepo.store).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(error);
  });
});

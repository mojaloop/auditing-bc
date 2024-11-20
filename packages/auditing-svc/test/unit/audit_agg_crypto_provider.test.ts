import { AuditAggregateCryptoProvider } from '../../src/infrastructure/audit_agg_crypto_provider';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import * as fs from 'fs';
import * as path from 'path';

describe('AuditAggregateCryptoProvider', () => {
  let mockLogger: ILogger;
  let privateKeyPath: string;
  let provider: AuditAggregateCryptoProvider;
  let tmpDir: string;

  beforeAll(() => {
    // Set up the mock logger
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

    // Create a temporary directory for keys
    tmpDir = fs.mkdtempSync(path.join(__dirname, 'tmp-'));
    privateKeyPath = path.join(tmpDir, 'private_key.pem');

    // Generate a private key file
    AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(privateKeyPath, 2048);
  });

  afterAll(() => {
    // Clean up the temporary directory
    fs.unlinkSync(privateKeyPath);
    fs.rmdirSync(tmpDir);
  });

  beforeEach(() => {
    provider = new AuditAggregateCryptoProvider(privateKeyPath, mockLogger);
  });

  test('should initialize correctly', async () => {
    await provider.init();

    // We can test that the public key fingerprint is as expected
    const fingerprint = await provider.getPubKeyFingerprint();
    expect(fingerprint).toBeDefined();
    expect(fingerprint).toHaveLength(40); // SHA1 hash is 40 hex chars
  });

  test('should get SHA1 signature correctly', async () => {
    await provider.init();

    const data = 'test data';
    const signature = await provider.getSha1Signature(data);

    expect(signature).toBeDefined();
    // We can check that the signature is a base64 string
    expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  test('should verify signature correctly', async () => {
    await provider.init();

    const data = 'test data';
    const signature = await provider.getSha1Signature(data);

    const fingerprint = await provider.getPubKeyFingerprint();

    const isValid = await provider.verifySourceSignature(data, fingerprint, signature);
    expect(isValid).toBe(true);
  });

  test('should fail verification with incorrect sourceKeyId', async () => {
    await provider.init();

    const data = 'test data';
    const signature = await provider.getSha1Signature(data);

    const wrongFingerprint = '1234567890abcdef1234567890abcdef12345678';

    const isValid = await provider.verifySourceSignature(data, wrongFingerprint, signature);
    expect(isValid).toBe(false);
  });

  test('should fail verification with incorrect signature', async () => {
    await provider.init();

    const data = 'test data';
    const signature = await provider.getSha1Signature(data);

    const fingerprint = await provider.getPubKeyFingerprint();

    const alteredSignature = (signature[0] === '=' ? 'A' : '=') + signature.slice(1);

    const isValid = await provider.verifySourceSignature(data, fingerprint, alteredSignature);
    expect(isValid).toBe(false);
  });

  test('should create RSA private key file', () => {
    const keyFilePath = path.join(tmpDir, 'new_private_key.pem');

    AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(keyFilePath, 2048);

    const keyExists = fs.existsSync(keyFilePath);
    expect(keyExists).toBe(true);

    // Clean up
    fs.unlinkSync(keyFilePath);
  });
});

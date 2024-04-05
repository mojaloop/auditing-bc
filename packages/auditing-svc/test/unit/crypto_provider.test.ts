import {LocalAuditClientCryptoProvider} from "@mojaloop/auditing-bc-client-lib";
import { ConsoleLogger } from "@mojaloop/logging-bc-public-types-lib";
import {existsSync, unlinkSync} from "fs";
import {AuditAggregateCryptoProvider} from "../../src/infrastructure/audit_agg_crypto_provider";
import path from "path";

describe('LocalAuditClientCryptoProvider', () => {
  const privateKeyPath = path.join(__dirname, "./tmp_private_key.pem");
  const testData = 'Hello, World!';

  beforeAll(() => {
    if(!existsSync(privateKeyPath)) {
      LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(privateKeyPath, 2048);
    }
  });

  afterAll(() => {
    if(existsSync(privateKeyPath)) {
        // delete the key file
        unlinkSync(privateKeyPath);
    }
  });

  describe('constructor', () => {
    it('should initialize with a given privateKeyPath', () => {
      const provider = new LocalAuditClientCryptoProvider(privateKeyPath);
      expect(provider).toHaveProperty('_privateKeyPath', privateKeyPath);
    });
  });

  describe('init', () => {
    it('should read the private key from the file and initialize key objects', async () => {
      const provider = new LocalAuditClientCryptoProvider(privateKeyPath);
      await provider.init();
      expect(provider).toHaveProperty('_privateKeyObj');
      expect(provider).toHaveProperty('_publicKeyObj');
    });
  });

  describe('getSha1Signature', () => {
    it('should return a base64 encoded SHA1 signature for a given string', async () => {
      const provider = new LocalAuditClientCryptoProvider(privateKeyPath);
      await provider.init();
      const signature = await provider.getSha1Signature(testData);
      expect(signature).toMatch(/\S+/); // Basic regex to check if the string is not empty or just whitespace
    });
  });

  describe('getPubKeyFingerprint', () => {
    it('should return a SHA1 fingerprint of the public key', async () => {
      const provider = new LocalAuditClientCryptoProvider(privateKeyPath);
      await provider.init();
      const fingerprint = await provider.getPubKeyFingerprint();
      expect(fingerprint).toMatch(/^\w+$/); // Basic regex for hexadecimal
    });

    // Additional tests could verify the fingerprint against known values
  });

  describe('createRsaPrivateKeyFileSync', () => {
    const tempPath = path.join(__dirname, "./tempPrivateKey_createRsaPrivateKeyFileSync.pem");
    beforeEach(() => {
        if(existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
    })
    afterEach(() => {
        if(existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
    })
    it('should create a new RSA private key file with the given parameters', () => {
      LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(tempPath, 2048);
    });
  });
});


describe('AuditAggregateCryptoProvider', () => {
  const privateKeyPath = path.join(__dirname, "./tmp_aggregate_private_key.pem")
  const testData = 'Test Data';
  let consoleLogger: ConsoleLogger;

  beforeAll(() => {
    consoleLogger = new ConsoleLogger();
    if(!existsSync(privateKeyPath)) {
      AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(privateKeyPath, 2048);
    }
  });

  afterAll(() => {
    if(existsSync(privateKeyPath)) {
        // delete the key file
        unlinkSync(privateKeyPath);
    }
  });

  describe('constructor', () => {
    it('should initialize with a given privateKeyPath and logger', () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      expect(provider).toHaveProperty('_privateKeyPath', privateKeyPath);
    });
  });

  describe('init', () => {
    it('should read the private key from the file, initialize key objects, and log initialization', async () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      await provider.init();
      expect(provider).toHaveProperty('_privateKeyObj');
      expect(provider).toHaveProperty('_publicKeyObj');
    });
  });

  describe('getSha1Signature', () => {
    it('should return a base64 encoded SHA1 signature for a given string', async () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      await provider.init();
      const signature = await provider.getSha1Signature(testData);
      expect(signature).toMatch(/\S+/); // Simple check for non-empty string
    });
  });

  describe('getPubKeyFingerprint', () => {
    it('should return a SHA1 fingerprint of the public key', async () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      await provider.init();
      const fingerprint = await provider.getPubKeyFingerprint();
      expect(fingerprint).toMatch(/^\w+$/); // Basic check for hexadecimal format
    });
  });

  describe('verifySourceSignature', () => {
    it('should verify the source signature correctly', async () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      await provider.init();

      // generate valid signature for testData generated with the corresponding public key
      const validSignature = await provider.getSha1Signature(testData);

      const sourceKeyId = await provider.getPubKeyFingerprint();
      const result = await provider.verifySourceSignature(testData, sourceKeyId, validSignature);
      expect(result).toBe(true);
    });

    it('should return false for an invalid signature', async () => {
        const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
        await provider.init();

        // generate valid signature for testData generated with the corresponding public key
        const validSignature = await provider.getSha1Signature(testData);

        const sourceKeyId = await provider.getPubKeyFingerprint();
        const result = await provider.verifySourceSignature('Invalid Data', sourceKeyId, validSignature);
        expect(result).toBe(false);
    });

    it('should return false for an invalid sourceKeyId', async () => {
        const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
        await provider.init();

        // generate valid signature for testData generated with the corresponding public key
        const validSignature = await provider.getSha1Signature(testData);

        const result = await provider.verifySourceSignature(testData, 'Invalid Key', validSignature);
        expect(result).toBe(false);
    });
  });

  describe('createRsaPrivateKeyFileSync', () => {
    const tempPath = path.join(__dirname, "./tempPrivateKey_createRsaPrivateKeyFileSync.pem");
    beforeEach(() => {
        if(existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
    })

    afterEach(() => {
        if(existsSync(tempPath)) {
            unlinkSync(tempPath);
        }
    })

    it('should create a new RSA private key file with the given parameters', () => {
      AuditAggregateCryptoProvider.createRsaPrivateKeyFileSync(tempPath, 2048);
    });
  });

  describe('destroy', () => {
    it('should return a resolved promise', async () => {
      const provider = new AuditAggregateCryptoProvider(privateKeyPath, consoleLogger);
      const result = await provider.destroy();
      expect(result).toBeUndefined();
    });
  });
});


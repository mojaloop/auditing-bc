# Mojaloop Auditing Client Library

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop/auditing-bc-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/auditing-bc-client-lib)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/auditing-bc-client-lib.svg?style=flat)](https://www.npmjs.com/package/@mojaloop/auditing-bc-client-lib)
[![CircleCI](https://circleci.com/gh/mojaloop/auditing-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/auditing-bc)

This library provides implementations for the IAuditClient interface defined in `@mojaloop/auditing-bc-public-types-lib`.

## Usage

### How to create the audit client and use it your code

```typescript
const AUDIT_KEY_FILE_PATH = "./tmp_key_file";
const IN_DEVELOPMENT_ENV = true;

// Get an ILogger - from @mojaloop/logging-bc-public-types-lib (or @mojaloop/logging-bc-client-lib)
const logger:ILogger = new DefaultLogger(BC_NAME, APP_NAME, APP_VERSION, LogLevel.DEBUG);

// If in dev mode try to create a tmp key file if one is not found
if (!existsSync(AUDIT_KEY_FILE_PATH)) {
    if (!IN_DEVELOPMENT_ENV) process.exit(9);
    // create a tmp key file - NEVER IN PRODUCTION
    LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(AUDIT_KEY_FILE_PATH, 2048);
}

// Create a child logger for the auditClient component
const auditLogger = logger.createChild("AuditLogger");
auditLogger.setLogLevel(LogLevel.INFO);
// auditLogger.init() // if using a logger like KafkaLogger make sure it is initialised

// Create an IAuditClientCryptoProvider using the LocalAuditClientCryptoProvider implementation
const cryptoProvider = new LocalAuditClientCryptoProvider(AUDIT_KEY_FILE_PATH);
// Create an IAuditClientDispatcher using the KafkaAuditClientDispatcher implementation
const auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, auditLogger);

// Create and initialise the actual auditClient instance
const auditClient:IAuditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
await auditClient.init();
```

### How to create audit entries

#### Simple audit entries

```typescript
// examples of how to create entries
// the simplest form for a successful action called "CreateAccount"
await auditClient.audit("CreateAccount", true);

// the simplest form for an unsuccessful try of the same action
await auditClient.audit("CreateAccount", false);
```

#### Audit entries with a security context

```typescript
// passing a security context (this should be obtained from the service application that calls the domain code)
const secCtx: AuditSecurityContext = {
    userId: "userid",
    appId: null,
    role: "role"
};
await auditClient.audit("ApproveParticipant", true, secCtx);

```

### How to include extra information in audit entries - labels

#### This is the structure of labels

```typescript
export declare type AuditEntryLabel = {
    key: string;
    value: string;
    encryptionKeyId?: string;
}
```
#### Creat the entry like this for cleartext content
```typescript
// adding meaningful data to the audit entry - called labels
await auditClient.audit("ApproveParticipant", true, secCtx, [{
    key: "participantId",
    value: "123"
}]);
```

### How to include encrypted (sensible) data in the extra information of audit entries

```typescript
await auditClient.audit("ApproveParticipant", true, secCtx, [{
    key: "participantId",
    value: "ENCRYPTED_DATA",
    encryptionKeyId: "key_fingerprint"
}]);


```

## How to extend this library and provide other Cryptography and Dispatcher implementations?

This client uses IAuditClientCryptoProvider to abstract the get signature and get fingerprint cryptographic functions and IAuditClientDispatcher to
abstract the sending of the audit entries.

Different implementations of those interfaces might be provided to the AuditClient in the constructor.

**Note:** Make sure the cryptographic implementation matches the service component cryptographic implementation.



## How to create RSA private and public keys without password

*These keys should be injected to the authentication-svc, or at this early stage put in the test_keys directory*

Create an RSA certificate

`openssl genrsa -out private.pem 2048`

Extract public certificate from private certificate

`openssl rsa -pubout -in private.pem -out public.pem`

## Key Fingerprints

Use openssl to get private key fingerprint:
```shell
openssl pkcs8 -in 2_private.pem -inform PEM -outform DER -topk8 -nocrypt | openssl sha1
```

Use openssl to get public key fingerprint:
```shell
openssl pkey -pubin -in public.pem -pubout -inform PEM -outform DER | openssl sha1
```


## Usage

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Dependencies

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
npm run start
```

## Unit Tests

```bash
npm run test:unit
```

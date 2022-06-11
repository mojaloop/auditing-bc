# logging common types 

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/auditing-bc.svg?style=flat)](https://github.com/mojaloop/auditing-bc/releases)
[![Npm Version](https://img.shields.io/npm/v/@mojaloop-poc/auditing-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/auditing-bc)
[![NPM Vulnerabilities](https://img.shields.io/snyk/vulnerabilities/npm/@mojaloop/auditing-bc.svg?style=flat)](https://www.npmjs.com/package/@mojaloop-poc/auditing-bc)
[![CircleCI](https://circleci.com/gh/mojaloop/auditing-bc.svg?style=svg)](https://circleci.com/gh/mojaloop/auditing-bc)

Mojaloop Logging Common Types


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

Notes:
- To use other hash change `sha1` to, for example `sha512`
- 

### Crypto cheat sheet
```typescript
import crypto from "crypto";
import {readFileSync} from "fs";

// Generate key pairs
// The `generateKeyPairSync` method accepts two arguments:
// 1. The type ok keys we want, which in this case is "rsa"
// 2. An object with the properties of the key
// const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
//     // The standard secure default length for RSA keys is 2048 bits
//     modulusLength: 2048,
// });

// Load keys from file
const privateKey =  readFileSync("./test_keys/2_private.pem");
const publicKey = readFileSync("./test_keys/2_public.pem");
const privateKeyObj =  crypto.createPrivateKey(privateKey);
const publicKeyObj = crypto.createPublicKey(publicKey);

// Re-export keys from crypto.KeyObject (in x.509/SPKI format)
console.log(`Private key: \n${privateKeyObj.export({format:"pem", type:"pkcs1"})}\n`);
console.log(`Private key: \n${privateKey.toString()}\n\n`);

console.log(`Public key: \n${publicKeyObj.export({format:"pem", type:"spki"})}\n`);
console.log(`Public key: \n${publicKey.toString()}\n`);

// exporting public key from private (in x.509/SPKI format)
const publicKeyObjFromPriv = crypto.createPublicKey(privateKey);
console.log(`Public key from priv: \n${publicKeyObjFromPriv.export({format:"pem", type:"spki"})}\n`);

// example of encryption and decryption
const data = "my secret data";
const encryptedData = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        // We convert the data string to a buffer using `Buffer.from`
        Buffer.from(data)
);
// The encrypted data is in the form of bytes, so we print it in base64 format
// so that it's displayed in a more readable form
console.log("encypted data: ", encryptedData.toString("base64"));

const decryptedData = crypto.privateDecrypt(
        {
            key: privateKey,
            // In order to decrypt the data, we need to specify the
            // same hashing function and padding scheme that we used to
            // encrypt the data in the previous step
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        encryptedData
);

// The decrypted data is of the Buffer type, which we can convert to a
// string to reveal the original data
console.log("decrypted data: ", decryptedData.toString());


// example of  sign and verify
const signature0 = crypto.createSign("sha1").update(data).end().sign(privateKey).toString("base64");
console.log("\nSignature (Base64): ", signature0);

const verified = crypto.createVerify("sha1").update(data).end().verify(publicKey, Buffer.from(signature0, "base64"));
console.log("\nSignature verified: ", verified);

// example key fingerprints
const privKeyDER = privateKeyObj.export({ type:"pkcs8", format: "der" });
let sha256sum = crypto.createHash("sha1").update(privKeyDER).digest("hex");
console.log(`Private Key Fingerprint: ${sha256sum}\n`);

const pubKeyDER = publicKeyObj.export({ type: "spki", format: "der" });
sha256sum = crypto.createHash("sha1").update(pubKeyDER).digest("hex");
console.log(`Public Key Fingerprint: ${sha256sum}\n`);

```

---


## Usage

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Yarn

```bash
npm -g yarn
```

### Install Dependencies

```bash
yarn
```

## Build

```bash
yarn build
```

## Run

```bash
yarn start
```

## Unit Tests

```bash
yarn test:unit
```

## Known Issues

- added `typescript` to [.ncurc.json](./.ncurc.json) as the `dep:update` script will install a non-supported version of typescript

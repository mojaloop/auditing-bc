"use strict";

/* istanbul ignore file */

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
const privateKey =  readFileSync("./test_keys/3_private.pem");
const publicKey = readFileSync("./test_keys/3_public.pem");
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
let keyFingerprint = crypto.createHash("sha1").update(privKeyDER).digest("hex");
console.log(`Private Key Fingerprint: ${keyFingerprint}\n`);

const pubKeyDER = publicKeyObj.export({ type: "spki", format: "der" });
keyFingerprint = crypto.createHash("sha1").update(pubKeyDER).digest("hex");
console.log(`Public Key Fingerprint: ${keyFingerprint}\n`);




process.exit();
console.log("\n\n\n\n");
/*


//
//
// // key fingerprints 2
// let strFingerprint0 = getCertificateFingerprint(privateKey.toString());
// console.log(`Private Key Fingerprint: ${strFingerprint0}\n`);
//
// strFingerprint0 = getCertificateFingerprint(publicKey.toString());
// console.log(`Public Key Fingerprint: ${strFingerprint0}\n`);





function getCertificateFingerprint(certString:string) {
    const baseString = certString.match(/-----BEGIN .* KEY-----\s*([\s\S]+?)\s*-----END .* KEY-----/i);
    const rawCert = Buffer.from(baseString![1], "base64");
    const sha256sum = crypto.createHash("sha1").update(rawCert).digest("hex");
    return sha256sum//sha256sum.toUpperCase().replace(/(.{2})(?!$)/g, "$1:");
    // eg 83:6E:3E:99:58:44:AE:61:72:55:AD:C6:24:BE:5C:2D:46:21:BA:BE:87:E4:3A:38:C8:E8:09:AC:22:48:46:20
}




// const key = new NodeRSA({b:512});
// const priv = key.exportKey("pkcs1-private-pem");
// const pub = key.exportKey("pkcs1-public-pem");

const privateKeyCert:Buffer = readFileSync("./test_keys/private.pem");
const publicKeyCert:Buffer = readFileSync("./test_keys/public.pem");



const key = new NodeRSA(privateKeyCert);

const priv = key.exportKey("pkcs1-private-pem");
const pub = key.exportKey("pkcs1-public-pem");

console.log(`Private key: \n${priv}\n`);
console.log(`Public key: \n${pub}\n`);

const text = 'Hello RSA!';
const encrypted = key.encrypt(text, "base64");
console.log('encrypted: ', encrypted);

const decrypted = key.decrypt(encrypted, "utf8");
console.log('decrypted: ', decrypted);

console.log("\n\n");


const importedPubKey = new NodeRSA();
importedPubKey.importKey(pub, "pkcs1-public-pem");

const privKeyFingerprint = crypto.createHash("sha1").update(privateKeyCert).digest("hex"); // Fingerprint (hash) as hexadecimal string
console.log(`privKeyFingerprint: ${privKeyFingerprint}\n`);

const pubKeyFingerprint = crypto.createHash("sha1").update(pub).digest("hex"); // Fingerprint (hash) as hexadecimal string
console.log(`pubKeyFingerprint: ${pubKeyFingerprint}\n`);
//

const pubStr = pub.toString().replace(new RegExp("\\\\n", "\g"), "\n");
// const x509 = new X509Certificate(pubStr);
const x509 = crypto.Certificate();
// console.log(`X509Certificate public Key Fingerprint: ${x509.}\n`);

let strFingerprint = getCertificateFingerprint(privateKeyCert.toString());
console.log(`Private Key Fingerprint: ${strFingerprint}\n`);

strFingerprint = getCertificateFingerprint(publicKeyCert.toString());
console.log(`Public Key Fingerprint: ${strFingerprint}\n`);


const obj = {
    name: "Pedro",
    age: 45
}
const objBuf = Buffer.from(JSON.stringify(obj));

//https://stackoverflow.com/questions/46522770/rsa-sign-in-node-js-and-verify-in-c
key.setOptions({signingScheme: "pkcs1-sha256"});
const signature = key.sign(objBuf, "base64");
console.log(`Signed: ${signature}`);

const verify = importedPubKey.verify(objBuf, signature, "base64", "base64");
console.log(`Verified: ${verify}`);


*/

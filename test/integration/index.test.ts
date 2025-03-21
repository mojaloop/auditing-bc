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

"use strict"

import {LogLevel} from "@mojaloop/logging-bc-public-types-lib"
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

import {
  AuditClient,
  IAuditClientCryptoProvider,
  IAuditClientDispatcher, KafkaAuditClientDispatcher,
  LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {existsSync} from "fs";
import { Client } from "@elastic/elasticsearch";

// direct imports from the svc module
import {Service} from "../../packages/auditing-svc/src/application/service";

import {
  AuditAggregateCryptoProvider
} from "@mojaloop/auditing-bc-auditing-svc/dist/infrastructure/audit_agg_crypto_provider";
import {MLKafkaRawConsumer, MLKafkaRawConsumerOutputType} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import {IRawMessageConsumer} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib/dist/raw/raw_types";



const BC_NAME = "auditing-bc";
const APP_NAME = "auditing-svc-integration-tests";
const APP_VERSION = "0.0.1";
const LOGLEVEL = LogLevel.INFO;

// Maybe set the env vars forcefully to run with different infra services/urls
const ELASTICSEARCH_URL = process.env["ELASTICSEARCH_URL"] || "https://localhost:9200";
const ELASTICSEARCH_AUDITS_INDEX = process.env["ELASTICSEARCH_AUDITS_INDEX"] || "ml-auditing";
const ELASTICSEARCH_USERNAME =  process.env["ELASTICSEARCH_USERNAME"] || "elastic";
const ELASTICSEARCH_PASSWORD =  process.env["ELASTICSEARCH_PASSWORD"] ||  "elasticSearchPas42";
const KAFKA_AUDITS_TOPIC = process.env["KAFKA_AUDITS_TOPIC"] || "audits";
const KAFKA_URL = process.env["KAFKA_URL"] || "localhost:9092";

const logger = new DefaultLogger(BC_NAME, APP_NAME, APP_VERSION, LOGLEVEL);

const TMP_KEY_PATH = "../tmp_key_file";

// client stuff


const secCtx: AuditSecurityContext = {
  userId: "userid",
  appId: null,
  role: "role"
}

const testAction = "testAction_"+Date.now();

const kafkaProducerOptions = {
  kafkaBrokerList: KAFKA_URL
}

describe("Auditing BC integration tests", () => {
  jest.setTimeout(15000);

  beforeAll(async () => {
    // common key pair
    if(!existsSync(TMP_KEY_PATH)) {
      LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(TMP_KEY_PATH, 2048);
    }

    // start the service with the same key
    const aggCrypto = new AuditAggregateCryptoProvider(TMP_KEY_PATH, logger);
    await aggCrypto.init();

    const kafkaConsumerOptions = {
      kafkaBrokerList: KAFKA_URL,
      kafkaGroupId: `${BC_NAME}_${APP_NAME}`,
      outputType: MLKafkaRawConsumerOutputType.Json
    }
    const kafkaConsumer = new MLKafkaRawConsumer(kafkaConsumerOptions, logger);

    await Service.start(
        logger.createChild("service"),
        undefined,
        aggCrypto,
        kafkaConsumer
    );
    await new Promise(f => setTimeout(f, 1000));
  });

  afterAll(async () => {
    // Cleanup
    await Service.stop();
  });


  test("AuditClient - test send audit entry", async () => {
    let auditClient: AuditClient;
    let cryptoProvider: IAuditClientCryptoProvider;
    let auditDispatcher: IAuditClientDispatcher;

    cryptoProvider = new LocalAuditClientCryptoProvider(TMP_KEY_PATH);
    auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, logger.createChild("auditDispatcher"));
    auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);

    await auditClient.init();
    logger.info("Sending audit entry with actionType: "+ testAction);
    await auditClient.audit(testAction, true, secCtx);
    logger.info("Audit entry sent");

    await auditClient.destroy();
  });

  test("test ES storage of audit entry", async () => {
    const elasticOpts = { node: ELASTICSEARCH_URL,
      auth: {
        username: ELASTICSEARCH_USERNAME,
        password: ELASTICSEARCH_PASSWORD,
      },
      tls: {
        ca: process.env.elasticsearch_certificate,
        rejectUnauthorized: false,
      }
    };


    // wait 2 secs to the entry to be indexed
    await new Promise(f => setTimeout(f, 5000));

    const esClient = new Client(elasticOpts);
    const result = await esClient.search({
      index: ELASTICSEARCH_AUDITS_INDEX,
      query: {
        match: {
          actionType: testAction
        }
      }
    });

    expect(result.hits.hits.length).toBeGreaterThan(0);

    await esClient.close();
  });


})

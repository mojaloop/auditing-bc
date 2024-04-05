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
"use strict"

import {LogLevel} from "@mojaloop/logging-bc-public-types-lib"
import {DefaultLogger} from "@mojaloop/logging-bc-client-lib";

import request from "supertest";

import {
  AuditClient,
  IAuditClientCryptoProvider,
  IAuditClientDispatcher, KafkaAuditClientDispatcher,
  LocalAuditClientCryptoProvider
} from "@mojaloop/auditing-bc-client-lib";
import {AuditSecurityContext} from "@mojaloop/auditing-bc-public-types-lib";
import {existsSync, unlinkSync} from "fs";
import { Client } from "@elastic/elasticsearch";

// direct imports from the svc module
import {Service} from "../../packages/auditing-svc/src/application/service";

import {
  AuditAggregateCryptoProvider
} from "@mojaloop/auditing-bc-auditing-svc/dist/infrastructure/audit_agg_crypto_provider";
import {MLKafkaRawConsumer, MLKafkaRawConsumerOutputType} from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import path from "path";

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

const TMP_KEY_PATH = path.join(__dirname, "../tmp_private_key.pem");

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
  let auditClient: AuditClient;
  let cryptoProvider: IAuditClientCryptoProvider;
  let auditDispatcher: IAuditClientDispatcher;
  let aggCrypto: AuditAggregateCryptoProvider;

  jest.setTimeout(15000);

  beforeAll(async () => {
    // common key pair
    if(!existsSync(TMP_KEY_PATH)) {
      LocalAuditClientCryptoProvider.createRsaPrivateKeyFileSync(TMP_KEY_PATH, 2048);
    }

    // start the service with the same key
    aggCrypto = new AuditAggregateCryptoProvider(TMP_KEY_PATH, logger);
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
    Service.auditRepo

    cryptoProvider = new LocalAuditClientCryptoProvider(TMP_KEY_PATH);
    auditDispatcher = new KafkaAuditClientDispatcher(kafkaProducerOptions, KAFKA_AUDITS_TOPIC, logger.createChild("auditDispatcher"));
    auditClient = new AuditClient(BC_NAME, APP_NAME, APP_VERSION, cryptoProvider, auditDispatcher);
    await auditClient.init();

    await new Promise(f => setTimeout(f, 1000));
  });

  afterAll(async () => {
    // Cleanup
    if(existsSync(TMP_KEY_PATH)) {
        // delete the key file
        unlinkSync(TMP_KEY_PATH);
    }
    await Service.stop();
  });


  test("AuditClient - test send audit entry", async () => {
    logger.info("Sending audit entry with actionType: "+ testAction);
    await auditClient.audit(testAction, true, secCtx);
    logger.info("Audit entry sent");

    await auditClient.destroy();
  });

  describe("ES Storage", () => {
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
    const esClient = new Client(elasticOpts);

    test("test ES storage of audit entry", async () => {
      // wait 2 secs to the entry to be indexed
      await new Promise(f => setTimeout(f, 5000));

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

  });

  describe("GET /health", () => {
    it('should return health status', async () => {
      const response = await request(Service.expressServer).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
    })
  })

  describe("GET /non-exists-route", () => {
    it('should return 404', async () => {
      const response = await request(Service.expressServer).get('/non-exists-route');
      expect(response.statusCode).toBe(404);
    })
  });

  describe("GET /entries/", () => {
    it('should return audit entries', async () => {
      const response = await request(Service.expressServer).get('/entries/');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.anything());
    });
  });

  describe('GET /searchKeywords/', () => {
    it('should return search keywords', async () => {
      const response = await request(Service.expressServer).get('/searchKeywords/');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.anything());
    });
  });

})

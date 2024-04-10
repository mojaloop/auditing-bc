# Auditing Bounded Context - Auditing Service

### Install

See notes in root dir of this repository
More information on how to install NVM: https://github.com/nvm-sh/nvm

## Build

```bash
npm run build
```

## Run this service

Anywhere in the repo structure:

```bash
npm run packages/auditing-svc start
```

## Auto build (watch)

```bash
npm run watch
```

## Unit Tests

```bash
npm run test:unit
```

## Integration Tests

```bash
npm run test:integration
```

## Docker image build

Notes:
- run at the root of the monorepo
- update the version tag at the end (0.1.0) to match the version on package.json
```bash
docker build -f packages/auditing-svc/Dockerfile -t mojaloop/auditing-bc-auditing-svc:0.1.0 .
```

## Configuration 

### Environment variables

| Environment Variable | Description    | Example Values         |
|---------------------|-----------------|-----------------------------------------|
| PRODUCTION_MODE      | Flag indicating production mode   | FALSE                  |
| LOG_LEVEL            | Logging level for the application                  | LogLevel.DEBUG        |
| KAFKA_LOGS_TOPIC      | Kafka topic for logs          | logs    |
| KAFKA_AUDITS_TOPIC        | Kafka topic for audits              | audits                 |
| ELASTICSEARCH_URL | Elastics Search Service URL | https://localhost:9200  | 
| ELASTICSEARCH_AUDITS_INDEX | Elastics Search Audits Index | ml-auditing  | 
| ELASTICSEARCH_USERNAME | Elastics Search User Name | elastic | 
| ELASTICSEARCH_PASSWORD | Elastics Search Password | elasticSearchPas42 | 
| KAFKA_URL       | Kafka broker URL     | localhost:9092          |
| CONSUMER_BATCH_SIZE   |  Kafka Consumer Batch Size   | 100    | 
| CONSUMER_BATCH_TIMEOUT_MS   |  Kafka Consumer Batch Timeout (Milliseconds)  | 1000  | 
| AUDIT_KEY_FILE_PATH  | File path for audit key           | /app/data/audit_private_key.pem         |
| SERVICE_START_TIMEOUT_MS               | Timeout for service startup in milliseconds        | 60_000                 |
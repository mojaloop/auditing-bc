# auditing-bc

**EXPERIMENTAL** vNext Auditing Bounded Context Mono Repository

{{DESCRIPTION}}

## Modules

### auditing-types-lib
### auditing-client-lib

{{DESCRIPTION}}

[README](modules/public-types-lib/README.md)
[README](modules/client-lib/README.md)

#### Run

```bash
npm run start:auditing-svc
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

#### Docker Image for Kafka
```bash
docker run -d -p 2181:2181 -p 9092:9092 -e ADVERTISED_HOST=127.0.0.1 --name kafka -e NUM_PARTITIONS=8 johnnypark/kafka-zookeeper
```

#### Docker Image for Kafka on Apple M1 Arch:
> The steps below need to be taken in order to run the `kafka-zookeeper` on Apple M1 ARM processors;  
1. Clone `https://github.com/hey-johnnypark/docker-kafka-zookeeper`
2. Modify the `Dockerfile` root image to FROM `alpine:3.15.0` (previously `3.9.2`)
3. Modify the build.sh to;
```text
docker build -t johnnypark/kafka-zookeeper:m1 --no-cache .
```
4. Run the following to start the image;
```shell
docker run -d -p 2181:2181 -p 9092:9092 -e ADVERTISED_HOST=127.0.0.1 --name kafka -e NUM_PARTITIONS=8 johnnypark/kafka-zookeeper:m1
```

#### Docker Compose for Auditing
> Startup, Kafka, Elasticsearch and Kibana. 

```shell
docker-compose up -d
```

## Build

```bash
npm install
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

## Integration Tests

Ensure the Kafka `zookeeper` is running prior to running the integration tests;
```shell
docker run -d -p 2181:2181 -p 9092:9092 -e ADVERTISED_HOST=127.0.0.1 --name kafka -e NUM_PARTITIONS=8 johnnypark/kafka-zookeeper
```

```bash
npm run test:integration
```


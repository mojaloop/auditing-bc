# auditing-bc

**EXPERIMENTAL** vNext Auditing Bounded Context Mono Repository

{{DESCRIPTION}}

## Modules

### auditing-types-lib
### auditing-client-lib

{{DESCRIPTION}}

[README](modules/auditing-types-lib/README.md)
[README](modules/auditing-client-lib/README.md)

#### Run

```bash
yarn start:auditing-svc
```

## Usage

### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

### Install Yarn

```bash
npm install --global yarn
npm -g yarn `(//TODO not working, remove)`
```

### Install Dependencies

```bash
yarn
```

If your release of yarn is not v3.x >, you will need to run the below command in order to enable v3.
```bash
yarn set version berry
```
   
Ensure the version is > 3.x.x via:
```bash
yarn --version
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
yarn install
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

## Integration Tests

Ensure the Kafka `zookeeper` is running prior to running the integration tests;
```shell
docker run -d -p 2181:2181 -p 9092:9092 -e ADVERTISED_HOST=127.0.0.1 --name kafka -e NUM_PARTITIONS=8 johnnypark/kafka-zookeeper
```

```bash
yarn test:integration
```


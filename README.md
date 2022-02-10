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


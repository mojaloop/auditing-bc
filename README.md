# auditing-bc

**EXPERIMENTAL** vNext Auditing Bounded Context Mono Repository

The Auditing BC is responsible for maintaining an immutable record of all of the transactions that take place on the Switch.

See the Reference Architecture documentation [Auditing Section](https://mojaloop.github.io/reference-architecture-doc/boundedContexts/auditing/) for context on this vNext implementation guidelines.  

## Contents
- [auditing-bc](#auditing-bc)
  - [Contents](#contents)
  - [Packages](#packages)
  - [Running Locally](#running-locally)
  - [Viewing the dashboards](#viewing-the-dashboards)
  - [Setup ElasticSearch Mappings](#setup-elasticsearch-mappings)
  - [Configuration](#configuration)
  - [Tests](#tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [CI/CD](#cicd-pipelines)
  - [Documentation](#documentation)
  - [Troubleshoot](#troubleshoot)

## Packages
The Auditing BC consists of the following packages;

`auditing-svc`
Auditing Service.
[README](./packages/auditing-svc/README.md)

`client-lib`
Auditing BC Client Library.
[README](./packages/client-lib/README.md)

`public-types-lib`
Auditing BC Public Types Library.
[README](./packages/public-types-lib/README.md)

## Running Locally

#### Run

```bash
npm run start:auditing-svc
```

### Usage

#### Install Node version

More information on how to install NVM: https://github.com/nvm-sh/nvm

```bash
nvm install
nvm use
```

#### Install Dependencies

```bash
npm install
```

#### Build

```bash
npm run build
```

### Run the services

#### Startup supporting services

Use https://github.com/mojaloop/platform-shared-tools/tree/main/packages/deployment/docker-compose-infra


To startup Kafka, MongoDB, Elasticsearch and Kibana, follow the steps below(executed in docker-compose-infra/):

1. Create a sub-directory called `exec` inside the `docker-compose-infra` (this) directory, and navigate to that directory.


```shell
mkdir exec
cd exec
```

2. Create the following directories as sub-directories of the `docker-compose/exec` directory:
* `certs`
* `esdata01`
* `kibanadata`
* `logs`

```shell
mkdir {certs,esdata01,kibanadata,logs}
```

3. Copy the `.env.sample` to the exec dir:
```shell
cp ../.env.sample ./.env
```

4. Review the contents of the `.env` file

5. Ensure `vm.max_map_count` is set to at least `262144`: Example to apply property on live system:
```shell
sysctl -w vm.max_map_count=262144 # might require sudo
```

#### Start Infrastructure Containers

Start the docker containers using docker-compose up (in the exec dir)
```shell
docker-compose -f ../docker-compose-infra.yml --env-file ./.env up -d
```


To view the logs of the infrastructure containers, run:
```shell
docker-compose -f ../docker-compose-infra.yml --env-file ./.env logs -f
```

To stop the infrastructure containers, run:
```shell
docker-compose -f ../docker-compose-infra.yml --env-file ./.env stop
```

## Viewing the dashboards

Once started, the services will available via localhost.
Use the credentials set in the .env file.

### ElasticSearch and Kibana
- ElasticSearch API - https://localhost:9200/
- Kibana - http://localhost:5601

### Kafka and RedPanda Console
- Kafka Broker - localhost:9092
- Zookeeper - localhost:2181
- RedPanda Kafka Console - http://localhost:8080

### Mongo and Mongo Express Console
- MongoDB - mongodb://localhost:27017
- Mongo Express Console - http://localhost:8081

&nbsp;

---

## Setup ElasticSearch Mappings

Once ElasticSearch has started you should upload the data mappings for the logs and audits indexes using the following commands.

This must be executed once after setting up a new ElasticSearch instance, or when the indexes are updated.

Execute this in the directory containing the files `es_mappings_logging.json` and `es_mappings_auditing.json`.

**When asked, enter the password for the `elastic` user in the `.env` file.**

```shell
# Create the logging index
curl -i --insecure -X PUT "https://localhost:9200/ml-logging/" -u "elastic" -H "Content-Type: application/json" --data-binary "@es_mappings_logging.json"
```
```shell
# Create the auditing index
curl -i --insecure -X PUT "https://localhost:9200/ml-auditing/" -u "elastic" -H "Content-Type: application/json" --data-binary "@es_mappings_auditing.json"
```

**NOTE:** The master/source for the mappings files is the respective repositories: [logging-bc](https://github.com/mojaloop/logging-bc/blob/main/docker-compose/es_mappings.json) and [auditing-bc](https://github.com/mojaloop/auditing-bc/blob/main/docker-compose/es_mappings.json).

We can see the indexes in ElasticSearch API:

![Scrrenshot](https://github.com/mojaloop/auditing-bc/blob/feature/2967-shared-tools-instruction/images/index.png)

##### Additional Information on Elastic mappings
https://www.elastic.co/guide/en/elasticsearch/reference/8.1/explicit-mapping.html
https://www.elastic.co/guide/en/elasticsearch/reference/8.1/mapping-types.html

## Setup Kibana Dashboards Setup

Once the mappings are installed, it is time to import the prebuilt Kibana objects for the _DataView_ and the _search_.

1. Open Kibana (login with credentials in .env file)
2. Navigate to **(top left burger icon) -> Management / Stack Management -> Kibana / Saved Objects**

>Or go directly to: http://localhost:5601/app/management/kibana/objects

3. Use the Import button on the top right to import the file `kibana-objects.ndjson` located in the `docker-compose` directory (this one).


## Viewing Kibana Logs

Go to **(top left burger icon) -> Analytics / Discover**, and then use the Open option on the top right to open the imported `"MojaloopDefaultLogView"` view.

## Viewing Kibana Audits

Go to **(top left burger icon) -> Analytics / Discover**, and then use the Open option on the top right to open the imported `"MojaloopDefaultLogView"` view.

## Additional information

### Useful Commands

#### Monitor Kafka Events _(Download the Kafka clients from https://kafka.apache.org/downloads.html)_
```shell
./kafka-console-consumer.sh --topic nodejs-rdkafka-svc-integration-test-log-bc-topic --from-beginning --bootstrap-server localhost:9092
```

### Shutdown
```shell
docker-compose down -v
```


## After running the docker-compose-infra we can start auditing-bc:
```shell
npm run start:auditing-svc
```

## Configuration

See the README.md file on each services for more Environment Variable Configuration options.

## Tests

### Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```shell
npm run test:integration
```

### Run all tests at once
Requires integration tests pre-requisites
```shell
npm run test
```

## Collect coverage (from both unit and integration test types)

After running the unit and/or integration tests: 

```shell
npm run posttest
```

You can then consult the html report in:

```shell
coverage/lcov-report/index.html
```

## Auditing Dependencies
We use npm audit to check dependencies for node vulnerabilities. 

To start a new resolution process, run:
```
npm run audit:fix
``` 

You can check to see if the CI will pass based on the current dependencies with:

```
npm run audit:check
```

## CI/CD Pipelines

### Execute locally the pre-commit checks - these will be executed with every commit and in the default CI/CD pipeline 

Make sure these pass before committing any code
```
npm run pre_commit_check
```

### Work Flow 

 As part of our CI/CD process, we use CircleCI. The CircleCI workflow automates the process of publishing changed packages to the npm registry and building Docker images for select packages before publishing them to DockerHub. It also handles versioning, tagging commits, and pushing changes back to the repository.

The process includes five phases. 
1. Setup : This phase initializes the environment, loads common functions, and retrieves commits and git change history since the last successful CI build.

2. Detecting Changed Package.

3. Publishing Changed Packages to NPM.

4. Building Docker Images and Publishing to DockerHub.

5. Pushing Commits to Git.

 All code is automatically linted, built, and unit tested by CircleCI pipelines, where unit test results are kept for all runs. All libraries are automatically published to npm.js, and all Docker images are published to Docker Hub.

 ## Documentation
The following documentation provides insight into the FSP Interoperability API Bounded Context.

- **Reference Architecture** - https://mojaloop.github.io/reference-architecture-doc/boundedContexts/auditing/
- **MIRO Board** - https://miro.com/app/board/o9J_lJyA1TA=/
- **Work Sessions** - https://docs.google.com/document/d/1Nm6B_tSR1mOM0LEzxZ9uQnGwXkruBeYB2slgYK1Kflo/edit#heading=h.6w64vxvw6er4


## Troubleshoot

### Unable to load dlfcn_load
```bash
error:25066067:DSO support routines:dlfcn_load:could not load the shared library
```
Fix: https://github.com/mojaloop/security-bc.git  `export OPENSSL_CONF=/dev/null`


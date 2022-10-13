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

## Build

```bash
npm run build
```

## Unit Tests

```bash
npm run test:unit
```

## Run the services 

### Startup supporting services

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

### Start Infrastructure Containers

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

# Viewing the dashboards

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

# Setup ElasticSearch Mappings

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
(https://github.com/mojaloop/auditing-bc/blob/feature/2967-shared-tools-instruction/images/index.png)

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

# Additional information

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

## Integration Tests
```bash
npm run test:integration
```

## Troubleshoot 

### Unable to load dlfcn_load
```bash
error:25066067:DSO support routines:dlfcn_load:could not load the shared library
```
Fix: https://github.com/mojaloop/security-bc.git  `export OPENSSL_CONF=/dev/null`


# auditing-bc `docker-compose`

#### Docker Compose for Auditing
> Startup, Kafka, Elasticsearch and Kibana. 

Follow the steps below prior to startup:
1. Create a new `.env` file with the following contents:
```properties
# Password for the 'elastic' user (at least 6 characters)
ELASTIC_PASSWORD=123@Edd!1234SS

# Password for the 'kibana_system' user (at least 6 characters)
KIBANA_PASSWORD=123@Edd!1234SS

# Version of Elastic products
STACK_VERSION=8.1.0

# Set the cluster name
CLUSTER_NAME=docker-cluster

# Set to 'basic' or 'trial' to automatically start the 30-day trial
LICENSE=basic
#LICENSE=trial

# Port to expose Elasticsearch HTTP API to the host
ES_PORT=9200
#ES_PORT=127.0.0.1:9200

# Port to expose Kibana to the host
KIBANA_PORT=5601
#KIBANA_PORT=80

# Increase or decrease based on the available host memory (in bytes)
MEM_LIMIT=2073741824

# Project namespace (defaults to the current folder name if not set)
#COMPOSE_PROJECT_NAME=myproject
```

2. Ensure `vm.max_map_count` is set to at least `262144`: Example to apply property on live system:
```properties
sysctl -w vm.max_map_count=262144
```
3. Create the following directories in the `docker-compose` directory:
* `certs`
* `esdata01`
* `esdata02`
* `esdata03`
* `logs`

### Startup
```shell
docker-compose up -d
```

### ElasticMappings

https://www.elastic.co/guide/en/elasticsearch/reference/8.1/explicit-mapping.html
List of mapping types:
https://www.elastic.co/guide/en/elasticsearch/reference/8.1/mapping-types.html

```shell
curl -X PUT "localhost:9200/mjl-auditing?pretty" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "id":    { "type": "long" },  
      "originalTimestamp": { "type": "date" },  
      "persistenceTimestamp": { "type": "date" },  
      "functionTransaction":  { "type": "keyword"  }, 
      "sourceBCSystemId":  { "type": "text"  }, 
      "sourceBCId":  { "type": "text"  }, 
      "sourceBCSignature":  { "type": "binary"  }, 
      "sourceBCKeyId":  { "type": "text"  }, 
      "sourceBCNetworkIdentifiers":  { "type": "keyword"  }, 
      "securityContext":  { "type": "object"  }, 
      "actionType":  { "type": "keyword"  }, 
      "success":  { "type": "boolean"  }, 
      "metaTrackingInfo":  { "type": "object"  }, 
      "labels":  { "type": "object"  }
    }
  }
}
'
```

### Ports
* 5601 -> [Kibana Local (http://localhost:5601)](http://localhost:5601)
* 9200 -> [ElasticSearch Local (https://localhost:9200)](https://localhost:9200)
* 9092 -> [Kafka Local (http://localhost:9092)](http://localhost:9092)

### Useful Commands

#### Monitor Kafka Events _(Download the Kafka clients from https://kafka.apache.org/downloads.html)_
```shell
./kafka-console-consumer.sh --topic nodejs-rdkafka-svc-integration-test-audit-bc-topic --from-beginning --bootstrap-server localhost:9092
```

### Shutdown
```shell
docker-compose down -v
```


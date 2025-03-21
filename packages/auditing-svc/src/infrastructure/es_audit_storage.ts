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

"use strict";

import {ILogger} from "@mojaloop/logging-bc-public-types-lib";
import {Client, errors} from "@elastic/elasticsearch";
import {ClientOptions} from "@elastic/elasticsearch/lib/client";
import {IAuditRepo} from "../domain/domain_interfaces";
import {AuditSearchResults, SignedCentralAuditEntry} from "../domain/server_types";
import {QueryDslQueryContainer, SearchTotalHits} from "@elastic/elasticsearch/lib/api/types";

const MAX_ENTRIES_PER_PAGE = 100;

export class ElasticsearchAuditStorage implements IAuditRepo {
    private _client: Client;
    private readonly _clientOps: ClientOptions;
    private readonly _index: string;
    private _logger: ILogger;

    constructor(opts: ClientOptions, index: string, logger: ILogger) {
        this._clientOps = opts;
        this._index = index;
        this._logger = logger.createChild(this.constructor.name);
        this._client = new Client(this._clientOps);
    }

    async init(): Promise<void> {
        this._logger.info("ElasticsearchAuditStorage initialised");

        // test the connection
        const info = await this._client.info();
        this._logger.info(`Connected to elasticsearch instance with name: ${info.name}, and cluster name: ${info.cluster_name}`);
    }

    async destroy(): Promise<void> {
        await this._client.close();
        return Promise.resolve();
    }


    async searchEntries(
        // text:string|null,
        userId:string|null,
        sourceBcName:string|null,
        sourceAppName:string|null,
        actionType:string|null,
        actionSuccessful:boolean|null,
        startDate:number|null,
        endDate:number|null,
        pageIndex = 0,
        pageSize: number = MAX_ENTRIES_PER_PAGE
    ): Promise<AuditSearchResults> {
        // make sure we don't go over or below the limits
        pageSize = Math.min(pageSize, MAX_ENTRIES_PER_PAGE);
        pageIndex = Math.max(pageIndex, 0);

        const searchResults: AuditSearchResults = {
            pageSize: pageSize,
            pageIndex: pageIndex,
            totalPages: 0,
            items: []
        };



        let query:QueryDslQueryContainer = { match_all: {} };
        const conditions = [];


        // if(text) conditions.push({match: {"securityContext.userId": text}});
        if(userId) conditions.push({match: {"securityContext.userId": userId}});
        if(sourceBcName) conditions.push({match: {"sourceBcName": sourceBcName}});
        if(sourceAppName) conditions.push({match: {"sourceAppName": sourceAppName}});
        if(actionType) conditions.push({match: {"actionType": actionType}});
        if(actionSuccessful != null) conditions.push({match: {"actionSuccessful": actionSuccessful}});

        if(startDate || endDate){
            const rangeCondition:any = {range: {"actionTimestamp": { }}};
            if(startDate){
                rangeCondition.range.actionTimestamp["gte"] = new Date(startDate).toISOString();
            }
            if(endDate){
                rangeCondition.range.actionTimestamp["lte"] = new Date(endDate).toISOString();
            }

            conditions.push(rangeCondition);
        }

        if(conditions.length > 0) {
            query = {
                bool: {
                    must: conditions,
                    //filter:[]
                }
            };
        }

        try {
            const from = Math.floor(pageIndex * pageSize);
            const result = await this._client.search({
                index: this._index,
                sort: [{"actionTimestamp": {"order":"desc"}}],
                size: pageSize,
                from: from,
                query: query,
                // keep the search results "scrollable" for 30 seconds, for other method of pagination
                // scroll: "30s",
            });

            if (result && result.hits && result.hits.hits) {
                result.hits.hits.forEach(value => {
                    searchResults.items.push(value._source as SignedCentralAuditEntry);
                });

                const totalEntries = (result.hits.total as SearchTotalHits).value;

                searchResults.totalPages = Math.ceil(totalEntries / pageSize);
                searchResults.pageSize = Math.max(pageSize, result.hits.hits.length);
            }
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(searchResults);
    }

    async store(entries: SignedCentralAuditEntry[]): Promise<void> {
        try {
            const onDocument = (doc:any):any=>{
                return {
                    index: {_index: this._index},
                    document: doc
                };
            };

            await this._client.helpers.bulk({
                datasource: entries,
                onDocument: onDocument.bind(this)
            });

        } catch (err) {
            this._logger.error("ElasticsearchAuditStorage error", err);
        }
    }

    async getSearchKeywords():Promise<{fieldName:string, distinctTerms:string[]}[]>{
        const retObj:{fieldName:string, distinctTerms:string[]}[] = [];

        try {
            const result:any = await this._client.search({
                "aggs": {
                    "sourceBcName": {
                        "terms": {
                            "field": "sourceBcName"
                        }
                    },"sourceAppName": {
                        "terms": {
                            "field": "sourceAppName"
                        }
                    },"actionType": {
                        "terms": {
                            "field": "actionType"
                        }
                    }
                },
                "_source": false
            });

            if (result && result.aggregations) {
                if(result.aggregations["actionType"] && result.aggregations["actionType"].buckets){
                    const actionType:{fieldName:string, distinctTerms:string[]} = {
                        fieldName: "actionType",
                        distinctTerms: []
                    };

                    for(const bucket of result.aggregations["actionType"].buckets){
                        actionType.distinctTerms.push(bucket.key);
                    }
                    retObj.push(actionType);
                }

                if(result.aggregations["sourceBcName"] && result.aggregations["sourceBcName"].buckets){
                    const sourceBcName:{fieldName:string, distinctTerms:string[]} = {
                        fieldName: "sourceBcName",
                        distinctTerms: []
                    };

                    for(const bucket of result.aggregations["sourceBcName"].buckets){
                        sourceBcName.distinctTerms.push(bucket.key);
                    }
                    retObj.push(sourceBcName);
                }

                if(result.aggregations["sourceAppName"] && result.aggregations["sourceAppName"].buckets){
                    const sourceAppName:{fieldName:string, distinctTerms:string[]} = {
                        fieldName: "sourceAppName",
                        distinctTerms: []
                    };

                    for(const bucket of result.aggregations["sourceAppName"].buckets){
                        sourceAppName.distinctTerms.push(bucket.key);
                    }
                    retObj.push(sourceAppName);
                }

            }
        } catch (err) {
            this._logger.error(err);
        }

        return Promise.resolve(retObj);
    }
}


/**
 License
 --------------
 Copyright © 2021 Mojaloop Foundation

 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License.

 You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list (alphabetical ordering) of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

 * Crosslake
 - Pedro Sousa Barreto <pedrob@crosslaketech.com>
 - Pedro Sousa Barreto <pedrosousabarreto@gmail.com>

 --------------
 **/

import { CallSecurityContext, ForbiddenError, IAuthorizationClient, UnauthorizedError } from "@mojaloop/security-bc-public-types-lib";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { TokenHelper } from "@mojaloop/security-bc-client-lib";
import express from "express";
import {IAuditRepo} from "../../domain/domain_interfaces";
import {AuditSearchResults, SignedCentralAuditEntry} from "../../domain/server_types";

declare module "express-serve-static-core" {
    export interface Request {
        securityContext: null | CallSecurityContext;
    }
}

export class AuditMainRoutes {

    private readonly _authorizationClient: IAuthorizationClient;
    private readonly _logger: ILogger;
    private readonly _mainRouter: express.Router;
    private readonly _tokenHelper: TokenHelper;
    private readonly _repo: IAuditRepo;

    constructor(logger: ILogger, repo: IAuditRepo) {
        this._logger = logger.createChild(this.constructor.name);
        this._mainRouter = express.Router();
        this._repo = repo;
        //this._authorizationClient = authorizationClient;
        //this._tokenHelper = tokenHelper;

        // inject authentication - all requests require a valid token
        //this._mainRouter.use(this._authenticationMiddleware.bind(this)); // TODO re-enable

        this.mainRouter.get("/entries/", this._getSearchEntries.bind(this));
        this.mainRouter.get("/searchKeywords/", this._getSearchKeywords.bind(this));
    }

    get logger(): ILogger {
        return this._logger;
    }

    get mainRouter(): express.Router {
        return this._mainRouter;
    }

    /*
    private async _authenticationMiddleware(req: express.Request, res: express.Response,next: express.NextFunction ) {
        const authorizationHeader = req.headers["authorization"];

        if (!authorizationHeader)
        {
            return res.sendStatus(401);
        }

        const bearer = authorizationHeader.trim().split(" ");
        if (bearer.length != 2) {
            return res.sendStatus(401);
        }

        const bearerToken = bearer[1];
        let verified;
        try {
            verified = await this._tokenHelper.verifyToken(bearerToken);
        } catch (err) {
            this._logger.error(err, "unable to verify token");
            return res.sendStatus(401);
        }
        if (!verified) {
            return res.sendStatus(401);
        }

        const decoded = this._tokenHelper.decodeToken(bearerToken);
        if (!decoded.sub || decoded.sub.indexOf("::") == -1) {
            return res.sendStatus(401);
        }

        const subSplit = decoded.sub.split("::");
        const subjectType = subSplit[0];
        const subject = subSplit[1];

        req.securityContext = {
            accessToken: bearerToken,
            clientId: subjectType.toUpperCase().startsWith("APP") ? subject : null,
            username: subjectType.toUpperCase().startsWith("USER") ? subject : null,
            rolesIds: decoded.roles,
        };

        return next();
    }
    */

    private _handleUnauthorizedError(err: Error, res: express.Response): boolean {
        if (err instanceof UnauthorizedError) {
            this._logger.warn(err.message);
            res.status(401).json({
                status: "error",
                msg: err.message,
            });
            return true;
        } else if (err instanceof ForbiddenError) {
            this._logger.warn(err.message);
            res.status(403).json({
                status: "error",
                msg: err.message,
            });
            return true;
        }

        return false;
    }

    private _enforcePrivilege(secCtx: CallSecurityContext, privilegeId: string): void {
        for (const roleId of secCtx.rolesIds) {
            if (this._authorizationClient.roleHasPrivilege(roleId, privilegeId)) {
                return;
            }
        }
        const error = new ForbiddenError("Caller is missing role with privilegeId: " + privilegeId);
        this._logger.isWarnEnabled() && this._logger.warn(error.message);
        throw error;
    }


    private async _getSearchEntries(req: express.Request, res: express.Response){
        // const text = req.query.text as string || null;
        const sourceBcName = req.query.sourceBcName as string || null;
        const sourceAppName = req.query.sourceAppName as string || null;
        const actionType = req.query.actionType as string || null;
        const actionSuccessfulStr = req.query.actionSuccessful as string || null;
        const actionSuccessful:boolean | null = actionSuccessfulStr ? Boolean(actionSuccessfulStr) : null;
        const userId = req.query.userId as string || null;
        const startDateStr = req.query.startDate as string || req.query.startdate as string;
        const startDate = startDateStr ? parseInt(startDateStr) : null;
        const endDateStr = req.query.endDate as string || req.query.enddate as string;
        const endDate = endDateStr ? parseInt(endDateStr) : null;

        // optional pagination
        const pageIndexStr = req.query.pageIndex as string || req.query.pageindex as string;
        const pageIndex = pageIndexStr ? parseInt(pageIndexStr) : undefined;

        const pageSizeStr = req.query.pageSize as string || req.query.pagesize as string;
        const pageSize = pageSizeStr ? parseInt(pageSizeStr) : undefined;

        try{
            const ret:AuditSearchResults = await this._repo.searchEntries(
                // text,
                userId,
                sourceBcName,
                sourceAppName,
                actionType,
                actionSuccessful,
                startDate,
                endDate,
                pageIndex,
                pageSize
            );
            res.send(ret);
        }   catch (err: any) {
            if (this._handleUnauthorizedError(err, res)) return;

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }

    private async _getSearchKeywords(req: express.Request, res: express.Response){
        try{
            const ret = await this._repo.getSearchKeywords();
            res.send(ret);
        }   catch (err: any) {
            if (this._handleUnauthorizedError(err, res)) return;

            this.logger.error(err);
            res.status(500).json({
                status: "error",
                msg: (err as Error).message,
            });
        }
    }
}

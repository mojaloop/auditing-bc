import express from "express";
import request from "supertest";
import { ILogger } from "@mojaloop/logging-bc-public-types-lib";
import { IAuditRepo } from "../../src/domain/domain_interfaces";
import { AuditMainRoutes } from "../../src/application/routes";
import { AuditSearchResults, SignedCentralAuditEntry } from "../../src/domain/server_types";
import { UnauthorizedError, ForbiddenError } from "@mojaloop/security-bc-public-types-lib";

describe("AuditMainRoutes", () => {
    let app: express.Express;
    let auditMainRoutes: AuditMainRoutes;
    let mockLogger: ILogger;
    let mockAuditRepo: IAuditRepo;

    beforeEach(() => {
        // Create a mock logger with methods
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            createChild: jest.fn(),
        } as unknown as ILogger;

        // Ensure createChild returns the same mockLogger
        (mockLogger.createChild as jest.Mock).mockReturnValue(mockLogger);

        mockAuditRepo = {
            init: jest.fn(),
            destroy: jest.fn(),
            store: jest.fn(),
            searchEntries: jest.fn(),
            getSearchKeywords: jest.fn(),
        } as IAuditRepo;

        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        auditMainRoutes = new AuditMainRoutes(mockLogger, mockAuditRepo);
        app.use("/", auditMainRoutes.mainRouter);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe("GET /entries/", () => {
        it("should return search results when valid query parameters are provided", async () => {
            // Arrange
            const mockSearchResults: AuditSearchResults = {
                pageSize: 10,
                totalPages: 1,
                pageIndex: 0,
                items: [
                    {
                        id: "entry1",
                        actionTimestamp: Date.now(),
                        sourceBcName: "bc1",
                        sourceAppName: "app1",
                        actionType: "action1",
                        actionSuccessful: true,
                        securityContext: {
                            userId: "user1",
                        },
                        // ... other properties
                    } as SignedCentralAuditEntry,
                ],
            };
            (mockAuditRepo.searchEntries as jest.Mock).mockResolvedValue(mockSearchResults);

            // Act
            const response = await request(app)
                .get("/entries/")
                .query({
                    userId: "user1",
                    sourceBcName: "bc1",
                    actionType: "action1",
                    actionSuccessful: true,
                    startDate: Date.now() - 1000 * 60 * 60,
                    endDate: Date.now(),
                    pageIndex: 0,
                    pageSize: 10,
                });

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockSearchResults);
            expect(mockAuditRepo.searchEntries).toHaveBeenCalledWith(
                "user1",
                "bc1",
                null, // sourceAppName
                "action1",
                true,
                expect.any(Number), // startDate
                expect.any(Number), // endDate
                0,
                10
            );
        });

        it("should return 500 when the repo throws an error", async () => {
            // Arrange
            (mockAuditRepo.searchEntries as jest.Mock).mockRejectedValue(new Error("Repo error"));

            // Act
            const response = await request(app).get("/entries/");

            // Assert
            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                status: "error",
                msg: "Repo error",
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 401 when UnauthorizedError is thrown", async () => {
            // Arrange
            const unauthorizedError = new UnauthorizedError("Unauthorized");
            (mockAuditRepo.searchEntries as jest.Mock).mockRejectedValue(unauthorizedError);

            // Act
            const response = await request(app).get("/entries/");

            // Assert
            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                status: "error",
                msg: "Unauthorized",
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("Unauthorized");
        });

        it("should return 403 when ForbiddenError is thrown", async () => {
            // Arrange
            const forbiddenError = new ForbiddenError("Forbidden");
            (mockAuditRepo.searchEntries as jest.Mock).mockRejectedValue(forbiddenError);

            // Act
            const response = await request(app).get("/entries/");

            // Assert
            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                status: "error",
                msg: "Forbidden",
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("Forbidden");
        });
    });

    describe("GET /searchKeywords/", () => {
        it("should return search keywords", async () => {
            // Arrange
            const mockKeywords = [
                {
                    fieldName: "actionType",
                    distinctTerms: ["action1", "action2"],
                },
                {
                    fieldName: "sourceBcName",
                    distinctTerms: ["bc1", "bc2"],
                },
            ];
            (mockAuditRepo.getSearchKeywords as jest.Mock).mockResolvedValue(mockKeywords);

            // Act
            const response = await request(app).get("/searchKeywords/");

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockKeywords);
            expect(mockAuditRepo.getSearchKeywords).toHaveBeenCalled();
        });

        it("should return 500 when the repo throws an error", async () => {
            // Arrange
            (mockAuditRepo.getSearchKeywords as jest.Mock).mockRejectedValue(new Error("Repo error"));

            // Act
            const response = await request(app).get("/searchKeywords/");

            // Assert
            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                status: "error",
                msg: "Repo error",
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 401 when UnauthorizedError is thrown", async () => {
            // Arrange
            const unauthorizedError = new UnauthorizedError("Unauthorized");
            (mockAuditRepo.getSearchKeywords as jest.Mock).mockRejectedValue(unauthorizedError);

            // Act
            const response = await request(app).get("/searchKeywords/");

            // Assert
            expect(response.status).toBe(401);
            expect(response.body).toEqual({
                status: "error",
                msg: "Unauthorized",
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("Unauthorized");
        });

        it("should return 403 when ForbiddenError is thrown", async () => {
            // Arrange
            const forbiddenError = new ForbiddenError("Forbidden");
            (mockAuditRepo.getSearchKeywords as jest.Mock).mockRejectedValue(forbiddenError);

            // Act
            const response = await request(app).get("/searchKeywords/");

            // Assert
            expect(response.status).toBe(403);
            expect(response.body).toEqual({
                status: "error",
                msg: "Forbidden",
            });
            expect(mockLogger.warn).toHaveBeenCalledWith("Forbidden");
        });
    });
});

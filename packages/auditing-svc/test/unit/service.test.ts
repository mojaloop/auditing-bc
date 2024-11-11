import { ConsoleLogger, ILogger, LogLevel } from "@mojaloop/logging-bc-public-types-lib";
import { MLKafkaRawConsumer } from "@mojaloop/platform-shared-lib-nodejs-kafka-client-lib";
import { AuditingAggregate } from "../../src/domain/auditing_agg";
import { IAuditAggregateCryptoProvider, IAuditRepo } from "../../src/domain/domain_interfaces";
import { Service } from "../../src/application/service";
import { AuditMainRoutes } from "../../src/application/routes";
import { existsSync } from "fs";

jest.mock("fs", () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

jest.mock("@mojaloop/platform-shared-lib-nodejs-kafka-client-lib", () => ({
    MLKafkaRawConsumer: jest.fn(),
}));

jest.mock("../../src/domain/auditing_agg", () => ({
    AuditingAggregate: jest.fn(),
}));

jest.mock("../../src/application/routes", () => ({
    AuditMainRoutes: jest.fn(),
}));

describe("Service", () => {
    let mockLogger: ILogger;
    let mockAuditRepo: IAuditRepo;
    let mockAggCryptoProvider: IAuditAggregateCryptoProvider;
    let mockKafkaConsumer: jest.Mocked<MLKafkaRawConsumer>;
    let mockAuditingAggregate: jest.Mocked<AuditingAggregate>;
    let mockAuditMainRoutes: any;

    beforeEach(() => {
        jest.resetAllMocks();

        // Mock implementations
        mockLogger = new ConsoleLogger();

        mockAuditRepo = {
            init: jest.fn(),
            destroy: jest.fn(),
            store: jest.fn(),
            searchEntries: jest.fn(),
            getSearchKeywords: jest.fn(),
        } as IAuditRepo;

        mockAggCryptoProvider = {
            init: jest.fn(),
            destroy: jest.fn(),
            verifySourceSignature: jest.fn(),
            getSha1Signature: jest.fn(),
            getPubKeyFingerprint: jest.fn(),
        } as IAuditAggregateCryptoProvider;

        mockKafkaConsumer = {
            connect: jest.fn(),
            disconnect: jest.fn(),
            destroy: jest.fn(),
            stop: jest.fn(),
            setTopics: jest.fn(),
            setBatchCallbackFn: jest.fn(),
            startAndWaitForRebalance: jest.fn(),
        } as unknown as jest.Mocked<MLKafkaRawConsumer>;

        mockAuditingAggregate = {
            init: jest.fn(),
            processMessages: jest.fn(),
        } as unknown as jest.Mocked<AuditingAggregate>;

        mockAuditMainRoutes = {
            mainRouter: jest.fn(),
        };

        // Mock module implementations
        const MLKafkaRawConsumerMock = MLKafkaRawConsumer as jest.MockedClass<typeof MLKafkaRawConsumer>;
        MLKafkaRawConsumerMock.mockImplementation(() => mockKafkaConsumer);

        const AuditMainRoutesMock = AuditMainRoutes as jest.MockedClass<typeof AuditMainRoutes>;
        AuditMainRoutesMock.mockImplementation(() => mockAuditMainRoutes);

        const AuditingAggregateMock = AuditingAggregate as jest.MockedClass<typeof AuditingAggregate>;
        AuditingAggregateMock.mockImplementation(() => mockAuditingAggregate);

        (existsSync as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
        jest.resetModules();
    });

    it("should start the service successfully", async () => {
        // Act
        await Service.start(mockLogger, mockAuditRepo, mockAggCryptoProvider, mockKafkaConsumer);

        // Assert
        expect(mockKafkaConsumer.connect).toHaveBeenCalled();
        expect(mockKafkaConsumer.startAndWaitForRebalance).toHaveBeenCalled();

        await Service.stop();
    });


    it("should create key file and start service when key file is missing in non-production mode", async () => {
        // Arrange
        (existsSync as jest.Mock).mockReturnValue(false);
        process.env["PRODUCTION_MODE"] = "false";

        // Act
        await Service.start(mockLogger, mockAuditRepo, mockAggCryptoProvider, mockKafkaConsumer);

        // Assert
        expect(mockKafkaConsumer.connect).toHaveBeenCalled();
        expect(mockKafkaConsumer.startAndWaitForRebalance).toHaveBeenCalled();

        await Service.stop();
    });

    it("should stop the service successfully", async () => {
        // Arrange
        Service.kafkaConsumer = mockKafkaConsumer;
        Service.auditRepo = mockAuditRepo;
        Service.aggCrypto = mockAggCryptoProvider;

        // Act
        await Service.stop();

        // Assert
        expect(mockKafkaConsumer.stop).toHaveBeenCalled();
        expect(mockKafkaConsumer.disconnect).toHaveBeenCalledWith(false);
        expect(mockKafkaConsumer.destroy).toHaveBeenCalledWith(false);
        expect(mockAuditRepo.destroy).toHaveBeenCalled();
        expect(mockAggCryptoProvider.destroy).toHaveBeenCalled();
        await Service.stop();

    });
});

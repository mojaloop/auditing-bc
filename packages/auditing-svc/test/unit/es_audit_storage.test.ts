import { ElasticsearchAuditStorage } from '../../src/infrastructure/es_audit_storage';
import { ILogger } from '@mojaloop/logging-bc-public-types-lib';
import { Client } from '@elastic/elasticsearch';
import { CentralAuditEntry, SignedCentralAuditEntry } from '../../src/domain/server_types';
import { jest } from '@jest/globals';

jest.mock('@elastic/elasticsearch');

describe('ElasticsearchAuditStorage', () => {
    let mockLogger: ILogger;
    let mockClient: jest.Mocked<Client>;
    let storage: ElasticsearchAuditStorage;
    let index: string;
    let clientOptions: any;

    beforeEach(() => {
        jest.resetAllMocks();

        // Mock Logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            isInfoEnabled: jest.fn().mockReturnValue(true),
            isDebugEnabled: jest.fn().mockReturnValue(true),
            isErrorEnabled: jest.fn().mockReturnValue(true),
            isWarnEnabled: jest.fn().mockReturnValue(true),
            isTraceEnabled: jest.fn().mockReturnValue(true),
            isFatalEnabled: jest.fn().mockReturnValue(true),
            createChild: jest.fn().mockReturnThis(),
        } as unknown as ILogger;

        clientOptions = { node: 'http://localhost:9200' };
        // Mock Elasticsearch Client
        const ClientMock = Client as jest.MockedClass<typeof Client>;
        mockClient = new ClientMock(clientOptions) as jest.Mocked<Client>;

        // Set up the storage instance
        index = 'test-index';
        storage = new ElasticsearchAuditStorage(clientOptions, index, mockLogger);
        // Replace the internal _client with our mock
        (storage as any)._client = mockClient;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('init should log and test the connection', async () => {
        // Arrange
        mockClient.info.mockResolvedValue({ name: 'es-node', cluster_name: 'es-cluster' } as any);

        // Act
        await storage.init();

        // Assert
        expect(mockLogger.info).toHaveBeenCalledWith('ElasticsearchAuditStorage initialised');
        expect(mockClient.info).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('Connected to elasticsearch instance with name: es-node, and cluster name: es-cluster');
    });

    test('destroy should close the client', async () => {
        // Arrange
        mockClient.close.mockResolvedValue(undefined);

        // Act
        await storage.destroy();

        // Assert
        expect(mockClient.close).toHaveBeenCalled();
    });

    test('store should index documents', async () => {
        // Arrange
        const centralAuditEntry: CentralAuditEntry = {
            // Properties from SourceAuditEntry
            id: 'entry1',
            actionTimestamp: Date.now(),
            sourceBcName: 'bc1',
            sourceAppName: 'app1',
            sourceAppVersion: '1.0.0',
            sourceKeyId: 'sourceKeyId',
            callerNetworkSources: [
                {
                    family: 'IPv4',
                    address: '127.0.0.1',
                },
            ],
            securityContext: {
                userId: 'user1',
                appId: 'app1',
                role: 'admin',
            },
            actionType: 'action1',
            actionSuccessful: true,
            labels: [
                {
                    key: 'label1',
                    value: 'value1',
                },
            ],
            // Properties specific to CentralAuditEntry
            invalidSourceSignature: false,
            persistenceTimestamp: Date.now(),
            auditingSvcAppName: 'auditingSvcAppName',
            auditingSvcAppVersion: 'auditingSvcAppVersion',
            auditingSvcKeyId: 'auditSvcKeyId',
            sourceSignature: 'sourceSignature',
        };

        const entries: SignedCentralAuditEntry[] = [
            {
                ...centralAuditEntry,
                auditingSvcSignature: 'auditingSvcSignature',
            },
        ];

        const bulkMock = jest.fn<(args: any) => Promise<any>>().mockResolvedValue({});
        (mockClient.helpers as any) = {
            bulk: bulkMock,
        };

        // Act
        await storage.store(entries);

        // Assert
        expect(bulkMock).toHaveBeenCalled();
        const bulkArgs = bulkMock.mock.calls[0][0] as any;
        expect(bulkArgs.datasource).toEqual(entries);
        expect(bulkArgs.onDocument).toBeDefined();
    });

    test('searchEntries should return search results', async () => {
        // Arrange
        const mockResponse = {
            hits: {
                total: { value: 1 },
                hits: [
                    {
                        _source: {
                            id: 'entry1',
                            actionTimestamp: Date.now(),
                            sourceBcName: 'bc1',
                            sourceAppName: 'app1',
                            actionType: 'action1',
                            actionSuccessful: true,
                            securityContext: {
                                userId: 'user1',
                                appId: 'app1',
                                role: 'admin',
                            },
                        },
                    },
                ],
            },
        };

        mockClient.search.mockResolvedValue(mockResponse as any);

        // Act
        const results = await storage.searchEntries(
            'user1',
            'bc1',
            'app1',
            'action1',
            true,
            Date.now() - 1000 * 60 * 60,
            Date.now(),
            0,
            10
        );

        // Assert
        expect(mockClient.search).toHaveBeenCalled();
        expect(results.items.length).toBe(1);
        expect(results.items[0].id).toBe('entry1');
        expect(results.totalPages).toBe(1);
        expect(results.pageSize).toBe(10);
    });

    test('getSearchKeywords should return distinct terms', async () => {
        // Arrange
        const mockResponse = {
            aggregations: {
                actionType: {
                    buckets: [
                        { key: 'action1' },
                        { key: 'action2' },
                    ],
                },
                sourceBcName: {
                    buckets: [
                        { key: 'bc1' },
                        { key: 'bc2' },
                    ],
                },
                sourceAppName: {
                    buckets: [
                        { key: 'app1' },
                        { key: 'app2' },
                    ],
                },
            },
        };

        mockClient.search.mockResolvedValue(mockResponse as any);

        // Act
        const keywords = await storage.getSearchKeywords();

        // Assert
        expect(mockClient.search).toHaveBeenCalled();
        expect(keywords.length).toBe(3);
        expect(keywords).toEqual([
            { fieldName: 'actionType', distinctTerms: ['action1', 'action2'] },
            { fieldName: 'sourceBcName', distinctTerms: ['bc1', 'bc2'] },
            { fieldName: 'sourceAppName', distinctTerms: ['app1', 'app2'] },
        ]);
    });

    test('searchEntries should handle errors gracefully', async () => {
        // Arrange
        const error = new Error('Elasticsearch error');
        mockClient.search.mockRejectedValue(error);

        // Act
        const results = await storage.searchEntries(
            'user1',
            null,
            null,
            null,
            null,
            null,
            null,
            0,
            10
        );

        // Assert
        expect(mockClient.search).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(error);
        expect(results.items.length).toBe(0);
        expect(results.totalPages).toBe(0);
    });

    test('getSearchKeywords should handle errors gracefully', async () => {
        // Arrange
        const error = new Error('Elasticsearch error');
        mockClient.search.mockRejectedValue(error);

        // Act
        const keywords = await storage.getSearchKeywords();

        // Assert
        expect(mockClient.search).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(error);
        expect(keywords.length).toBe(0);
    });
});

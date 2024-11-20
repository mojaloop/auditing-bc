"use strict"
// Mock the Service module
jest.mock('../../src/application/service.ts', () => ({
  Service: {
    start: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Application Entry Point', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('should call Service.start() and log completion message', async () => {
    // Import index.ts after mocking
    await import('../../src/application/index');

    const { Service } = await import('../../src/application/service');

    expect(Service.start).toHaveBeenCalled();

    // Wait for the promise to resolve
    await Service.start();

    expect(consoleLogSpy).toHaveBeenCalledWith('Service start complete');
  });
});


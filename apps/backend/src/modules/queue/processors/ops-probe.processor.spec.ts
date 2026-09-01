import { Worker } from 'bullmq';
import { OpsProbeProcessor } from './ops-probe.processor';

jest.mock('bullmq');

describe('OpsProbeProcessor', () => {
  let processor: OpsProbeProcessor;
  let mockRedisClient: any;
  let workerHandler: any;
  let mockWorkerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient = {};

    mockWorkerInstance = {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (Worker as unknown as jest.Mock).mockImplementation((_name, handler) => {
      workerHandler = handler;
      return mockWorkerInstance;
    });

    processor = new OpsProbeProcessor(mockRedisClient);
  });

  it('initializes BullMQ worker onModuleInit', () => {
    processor.onModuleInit();
    expect(Worker).toHaveBeenCalledWith(
      'ops-probe',
      expect.any(Function),
      expect.objectContaining({ concurrency: 5 }),
    );
  });

  it('processes job and returns result', async () => {
    processor.onModuleInit();
    const mockJob = {
      id: 'job-1',
      data: { probeId: 'probe-1', message: 'Hello Worker' },
      attemptsMade: 0,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    };

    const result = await workerHandler(mockJob);
    expect(result.message).toBe('Hello Worker');
    expect(result.attemptsMade).toBe(1);
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });

  it('simulates retry error when failAttempts is specified and attemptsMade < failAttempts', async () => {
    processor.onModuleInit();
    const mockJob = {
      id: 'job-2',
      data: { probeId: 'probe-2', message: 'Retry test', failAttempts: 2 },
      attemptsMade: 0,
      updateProgress: jest.fn(),
    };

    await expect(workerHandler(mockJob)).rejects.toThrow(
      /Simulated transient failure/,
    );
  });

  it('closes worker on module destroy', async () => {
    processor.onModuleInit();
    await processor.onModuleDestroy();
    expect(mockWorkerInstance.close).toHaveBeenCalled();
  });
});

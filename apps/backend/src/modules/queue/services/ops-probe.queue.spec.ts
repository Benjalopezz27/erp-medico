import { Queue } from 'bullmq';
import { OpsProbeQueueService } from './ops-probe.queue';

jest.mock('bullmq');

describe('OpsProbeQueueService', () => {
  let service: OpsProbeQueueService;
  let mockRedisClient: any;
  let mockQueueInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient = {
      on: jest.fn(),
    };

    mockQueueInstance = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest
        .fn()
        .mockResolvedValue({ id: 'job-123', data: { probeId: 'p1' } }),
      getWaitingCount: jest.fn().mockResolvedValue(1),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(5),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (Queue as unknown as jest.Mock).mockImplementation(() => mockQueueInstance);

    service = new OpsProbeQueueService(mockRedisClient);
  });

  it('enqueues probe job with exponential retry policy', async () => {
    const job = await service.enqueueProbeJob({
      probeId: 'probe-001',
      message: 'Test message',
      failAttempts: 1,
    });

    expect(job.id).toBe('job-123');
    expect(mockQueueInstance.add).toHaveBeenCalledWith(
      'ops-probe-job',
      expect.objectContaining({
        probeId: 'probe-001',
        message: 'Test message',
        failAttempts: 1,
      }),
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      }),
    );
  });

  it('retrieves queue metrics correctly', async () => {
    const metrics = await service.getQueueMetrics();
    expect(metrics).toEqual({
      waiting: 1,
      active: 0,
      completed: 5,
      failed: 0,
      delayed: 0,
    });
  });

  it('closes queue on destroy', async () => {
    await service.onModuleDestroy();
    expect(mockQueueInstance.close).toHaveBeenCalled();
  });
});

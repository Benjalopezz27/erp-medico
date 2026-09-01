import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { OpsProbeQueueService } from './ops-probe.queue';
import { REDIS_CONNECTION } from '../queue.constants';

jest.mock('bullmq', () => {
  const mockQueueInstance = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    getJob: jest.fn(),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 1,
      active: 0,
      completed: 5,
      failed: 0,
      delayed: 0,
    }),
    isPaused: jest.fn().mockResolvedValue(false),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Queue: jest.fn().mockImplementation(() => mockQueueInstance),
  };
});

describe('OpsProbeQueueService', () => {
  let service: OpsProbeQueueService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = { status: 'ready' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpsProbeQueueService,
        {
          provide: REDIS_CONNECTION,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<OpsProbeQueueService>(OpsProbeQueueService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should enqueue a job into ops-probe queue with exponential backoff', async () => {
    const result = await service.enqueueProbeJob({
      probeId: 'probe-001',
      message: 'Test message',
    });

    expect(result.jobId).toBe('job-123');
    expect(result.probeId).toBe('probe-001');
    expect(Queue).toHaveBeenCalledWith(
      'ops-probe',
      expect.objectContaining({
        connection: mockRedis,
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
        }),
      }),
    );
  });

  it('should return queue metrics', async () => {
    const metrics = await service.getQueueMetrics();
    expect(metrics.queueName).toBe('ops-probe');
    expect(metrics.waiting).toBe(1);
    expect(metrics.completed).toBe(5);
    expect(metrics.paused).toBe(false);
  });
});

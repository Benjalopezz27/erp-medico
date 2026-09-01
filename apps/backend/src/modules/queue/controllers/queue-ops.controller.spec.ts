import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { QueueOpsController } from './queue-ops.controller';
import { OpsProbeQueueService } from '../services/ops-probe.queue';

describe('QueueOpsController', () => {
  let controller: QueueOpsController;
  let mockQueueService: Partial<OpsProbeQueueService>;

  beforeEach(async () => {
    mockQueueService = {
      enqueueProbeJob: jest.fn().mockResolvedValue({
        jobId: 'job-123',
        probeId: 'probe-abc',
        enqueuedAt: new Date().toISOString(),
      }),
      getJobStatus: jest.fn().mockImplementation((jobId: string) => {
        if (jobId === 'job-123') {
          return Promise.resolve({
            jobId: 'job-123',
            probeId: 'probe-abc',
            status: 'completed',
            attemptsMade: 1,
            result: { success: true },
          });
        }
        return Promise.resolve(null);
      }),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueName: 'ops-probe',
        waiting: 2,
        active: 1,
        completed: 10,
        failed: 0,
        delayed: 0,
        paused: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueOpsController],
      providers: [
        {
          provide: OpsProbeQueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    controller = module.get<QueueOpsController>(QueueOpsController);
  });

  it('should enqueue a probe job via POST /ops/queue/probe', async () => {
    const result = await controller.triggerProbe({ message: 'test probe' });
    expect(result.statusCode).toBe(201);
    expect(result.data.jobId).toBe('job-123');
    expect(mockQueueService.enqueueProbeJob).toHaveBeenCalledWith({
      message: 'test probe',
    });
  });

  it('should return job status via GET /ops/queue/probe/:jobId', async () => {
    const result = await controller.getProbeStatus('job-123');
    expect(result.statusCode).toBe(200);
    expect(result.data.status).toBe('completed');
  });

  it('should throw NotFoundException for unknown jobId', async () => {
    await expect(controller.getProbeStatus('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return queue metrics via GET /ops/queue/metrics', async () => {
    const result = await controller.getMetrics();
    expect(result.statusCode).toBe(200);
    expect(result.data.waiting).toBe(2);
    expect(result.data.active).toBe(1);
  });
});

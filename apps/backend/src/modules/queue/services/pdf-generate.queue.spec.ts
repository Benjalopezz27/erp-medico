import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { PdfGenerateQueueService } from './pdf-generate.queue';
import { REDIS_CONNECTION } from '../queue.constants';

jest.mock('bullmq', () => {
  const mockQueueInstance = {
    add: jest.fn().mockResolvedValue({ id: 'pdf-generate:doc-1' }),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Queue: jest.fn().mockImplementation(() => mockQueueInstance),
  };
});

describe('PdfGenerateQueueService', () => {
  let service: PdfGenerateQueueService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = { status: 'ready' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGenerateQueueService,
        { provide: REDIS_CONNECTION, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PdfGenerateQueueService>(PdfGenerateQueueService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('enqueues a job with a deterministic jobId derived from fiscalDocumentId', async () => {
    const result = await service.enqueue({ fiscalDocumentId: 'doc-1' });

    expect(result.jobId).toBe('pdf-generate:doc-1');
    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    expect(queueInstance.add).toHaveBeenCalledWith(
      'pdf-generate-job',
      { fiscalDocumentId: 'doc-1' },
      { jobId: 'pdf-generate:doc-1' },
    );
  });

  it('a second enqueue for the same fiscalDocumentId does not create a duplicate job', async () => {
    await service.enqueue({ fiscalDocumentId: 'doc-1' });
    await service.enqueue({ fiscalDocumentId: 'doc-1' });

    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    const calls = queueInstance.add.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toEqual({ jobId: 'pdf-generate:doc-1' });
    expect(calls[1][2]).toEqual({ jobId: 'pdf-generate:doc-1' });
  });
});

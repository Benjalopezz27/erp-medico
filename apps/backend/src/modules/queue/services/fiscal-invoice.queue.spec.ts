import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { FiscalInvoiceQueueService } from './fiscal-invoice.queue';
import { REDIS_CONNECTION } from '../queue.constants';

jest.mock('bullmq', () => {
  const mockQueueInstance = {
    add: jest.fn().mockResolvedValue({ id: 'wsfe-emit:doc-1' }),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Queue: jest.fn().mockImplementation(() => mockQueueInstance),
  };
});

describe('FiscalInvoiceQueueService', () => {
  let service: FiscalInvoiceQueueService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = { status: 'ready' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalInvoiceQueueService,
        { provide: REDIS_CONNECTION, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<FiscalInvoiceQueueService>(FiscalInvoiceQueueService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('enqueues a job with a deterministic jobId derived from fiscalDocumentId', async () => {
    const result = await service.enqueueCaeRequest({
      fiscalDocumentId: 'doc-1',
    });

    expect(result.jobId).toBe('wsfe-emit:doc-1');
    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    expect(queueInstance.add).toHaveBeenCalledWith(
      'wsfe-emit-job',
      { fiscalDocumentId: 'doc-1' },
      { jobId: 'wsfe-emit:doc-1' },
    );
  });

  it('a second enqueue for the same fiscalDocumentId reuses the same jobId', async () => {
    await service.enqueueCaeRequest({ fiscalDocumentId: 'doc-1' });
    await service.enqueueCaeRequest({ fiscalDocumentId: 'doc-1' });

    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    const calls = queueInstance.add.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toEqual({ jobId: 'wsfe-emit:doc-1' });
    expect(calls[1][2]).toEqual({ jobId: 'wsfe-emit:doc-1' });
  });
});

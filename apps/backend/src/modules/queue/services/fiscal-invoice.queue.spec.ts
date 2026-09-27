import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { FiscalInvoiceQueueService } from './fiscal-invoice.queue';
import { REDIS_CONNECTION } from '../queue.constants';

jest.mock('bullmq', () => {
  const mockQueueInstance = {
    add: jest.fn().mockResolvedValue({ id: 'wsfe-emit-doc-1' }),
    getJob: jest.fn().mockResolvedValue(undefined),
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

    expect(result.jobId).toBe('wsfe-emit-doc-1');
    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    expect(queueInstance.add).toHaveBeenCalledWith(
      'wsfe-emit-job',
      { fiscalDocumentId: 'doc-1' },
      { jobId: 'wsfe-emit-doc-1' },
    );
  });

  it('a second enqueue for the same fiscalDocumentId reuses the same jobId', async () => {
    await service.enqueueCaeRequest({ fiscalDocumentId: 'doc-1' });
    await service.enqueueCaeRequest({ fiscalDocumentId: 'doc-1' });

    const queueInstance = (Queue as unknown as jest.Mock).mock.results[0].value;
    const calls = queueInstance.add.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toEqual({ jobId: 'wsfe-emit-doc-1' });
    expect(calls[1][2]).toEqual({ jobId: 'wsfe-emit-doc-1' });
  });

  it('configures the queue with 6 attempts and 30s exponential backoff', async () => {
    await service.enqueueCaeRequest({ fiscalDocumentId: 'doc-1' });
    const options = (Queue as unknown as jest.Mock).mock.calls[0][1];
    expect(options.defaultJobOptions.attempts).toBe(6);
    expect(options.defaultJobOptions.backoff).toEqual({
      type: 'exponential',
      delay: 30000,
    });
  });

  describe('requeue', () => {
    it('adds a job when none exists for the document', async () => {
      await service.enqueueCaeRequest({ fiscalDocumentId: 'warmup' });
      const instance = (Queue as unknown as jest.Mock).mock.results[0].value;
      instance.getJob.mockResolvedValueOnce(undefined);

      const result = await service.requeue('doc-1');

      expect(result).toEqual({ jobId: 'wsfe-emit-doc-1', created: true });
      expect(instance.add).toHaveBeenLastCalledWith(
        'wsfe-emit-job',
        { fiscalDocumentId: 'doc-1' },
        { jobId: 'wsfe-emit-doc-1' },
      );
    });

    it('leaves an in-flight job untouched and returns its id', async () => {
      await service.enqueueCaeRequest({ fiscalDocumentId: 'warmup' });
      const instance = (Queue as unknown as jest.Mock).mock.results[0].value;
      const getState = jest.fn().mockResolvedValue('delayed');
      const remove = jest.fn();
      instance.getJob.mockResolvedValueOnce({ getState, remove });

      const result = await service.requeue('doc-1');

      expect(result).toEqual({ jobId: 'wsfe-emit-doc-1', created: false });
      expect(remove).not.toHaveBeenCalled();
    });

    it('removes a terminal job before re-adding it', async () => {
      await service.enqueueCaeRequest({ fiscalDocumentId: 'warmup' });
      const instance = (Queue as unknown as jest.Mock).mock.results[0].value;
      const getState = jest.fn().mockResolvedValue('failed');
      const remove = jest.fn().mockResolvedValue(undefined);
      instance.getJob.mockResolvedValueOnce({ getState, remove });

      const result = await service.requeue('doc-1');

      expect(remove).toHaveBeenCalled();
      expect(result).toEqual({ jobId: 'wsfe-emit-doc-1', created: true });
    });
  });
});

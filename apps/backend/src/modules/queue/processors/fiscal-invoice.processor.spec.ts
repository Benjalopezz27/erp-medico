import { FiscalInvoiceProcessor } from './fiscal-invoice.processor';

jest.mock('bullmq', () => ({
  Worker: jest
    .fn()
    .mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

/**
 * The domain logic (Escenario A/B, clasificación de errores, idempotencia)
 * now lives in FiscalContingencyOrchestrator and is covered by
 * fiscal-contingency-orchestrator.service.spec.ts. This suite only covers
 * the processor's own responsibility as a thin BullMQ adapter: open the
 * transaction, delegate, and enqueue pdf-generate post-commit iff emitted.
 */
describe('FiscalInvoiceProcessor', () => {
  let processor: FiscalInvoiceProcessor;
  let dataSource: any;
  let orchestrator: any;
  let pdfGenerateQueueService: any;

  beforeEach(() => {
    dataSource = {
      transaction: jest.fn((work: (manager: unknown) => unknown) =>
        work({ marker: 'tx-manager' }),
      ),
    };

    orchestrator = {
      process: jest.fn().mockResolvedValue({
        status: 'emitted',
        fiscalDocumentId: 'doc-1',
      }),
    };

    pdfGenerateQueueService = {
      enqueue: jest.fn().mockResolvedValue({ jobId: 'pdf-generate-doc-1' }),
    };

    processor = new FiscalInvoiceProcessor(
      {} as any,
      dataSource,
      orchestrator,
      pdfGenerateQueueService,
    );
  });

  it('runs the orchestrator inside a single transaction', async () => {
    await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(orchestrator.process).toHaveBeenCalledWith(
      { marker: 'tx-manager' },
      expect.objectContaining({ id: 'job-1' }),
      'doc-1',
    );
  });

  it('enqueues pdf-generate post-commit when the result is emitted', async () => {
    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'emitted', fiscalDocumentId: 'doc-1' });
    expect(pdfGenerateQueueService.enqueue).toHaveBeenCalledWith({
      fiscalDocumentId: 'doc-1',
    });
  });

  it('does not enqueue pdf-generate when the emission is rejected or skipped', async () => {
    orchestrator.process.mockResolvedValue({
      status: 'skipped',
      fiscalDocumentId: 'doc-1',
    });

    await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(pdfGenerateQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('still returns emitted even if the pdf-generate enqueue fails', async () => {
    pdfGenerateQueueService.enqueue.mockRejectedValue(new Error('Redis down'));

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'emitted', fiscalDocumentId: 'doc-1' });
  });

  it('rethrows post-commit when the orchestrator signals a scheduled retry', async () => {
    orchestrator.process.mockResolvedValue({
      status: 'retrying',
      fiscalDocumentId: 'doc-1',
      error: 'WSFE network error: ECONNRESET',
    });

    await expect(
      processor.process({
        id: 'job-1',
        data: { fiscalDocumentId: 'doc-1' },
      } as any),
    ).rejects.toThrow(/ECONNRESET/);

    expect(pdfGenerateQueueService.enqueue).not.toHaveBeenCalled();
  });

  it('exposes the underlying BullMQ worker via getWorker()', () => {
    expect(processor.getWorker()).toBeNull();
    processor.onModuleInit();
    expect(processor.getWorker()).not.toBeNull();
  });
});

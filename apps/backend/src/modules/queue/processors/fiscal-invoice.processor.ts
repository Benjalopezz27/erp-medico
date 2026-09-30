import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import {
  REDIS_CONNECTION,
  FISCAL_INVOICE_QUEUE_NAME,
} from '../queue.constants';
import { FiscalInvoiceJobData } from '../services/fiscal-invoice.queue';
import { PdfGenerateQueueService } from '../services/pdf-generate.queue';
import {
  FiscalContingencyOrchestrator,
  FiscalInvoiceJobResult,
} from '../services/fiscal-contingency-orchestrator.service';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';

export { FiscalInvoiceJobResult } from '../services/fiscal-contingency-orchestrator.service';

/**
 * Consumer for the `wsfe-emit` queue. Thin BullMQ adapter: opens the
 * transaction holding a row lock on the `FiscalDocument` for the whole
 * external round-trip, and delegates all contingency/domain logic to
 * `FiscalContingencyOrchestrator` (Escenario A/B, clasificación de errores,
 * agotamiento de reintentos — ver openspec/changes/arca-contingency-engine).
 */
@Injectable()
export class FiscalInvoiceProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FiscalInvoiceProcessor.name);
  private worker: Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult> | null =
    null;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisClient: Redis,
    private readonly dataSource: DataSource,
    private readonly orchestrator: FiscalContingencyOrchestrator,
    private readonly pdfGenerateQueueService: PdfGenerateQueueService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult>(
      FISCAL_INVOICE_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: this.redisClient as any,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`[Worker] wsfe-emit job ${job.id} completed.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(
        `[Worker] wsfe-emit job ${job?.id} failed: ${redactSecrets(err.message)}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async process(
    job: Job<FiscalInvoiceJobData, FiscalInvoiceJobResult>,
  ): Promise<FiscalInvoiceJobResult> {
    const { fiscalDocumentId } = job.data;

    // Runs inside a single transaction holding a row lock on the
    // FiscalDocument for the whole external round-trip: a concurrent worker
    // picking up the same job blocks on the lock instead of also calling
    // ARCA, and sees the already-resolved status once it acquires it.
    const result = await this.dataSource.transaction((manager) =>
      this.orchestrator.process(manager, job, fiscalDocumentId),
    );

    if (result.status === 'retrying') {
      // The attempt-metadata UPDATE already committed above; throwing here
      // (post-commit) is what makes BullMQ actually schedule the retry.
      throw new Error(result.error);
    }

    if (result.status === 'emitted') {
      // Post-commit, never inside the transaction: a failure to enqueue the
      // documental job must never roll back an already-authorized CAE. The
      // document simply stays without an artifact until a download retries
      // the enqueue (see PdfGenerateProcessor / the download endpoint).
      try {
        await this.pdfGenerateQueueService.enqueue({ fiscalDocumentId });
      } catch (enqueueError) {
        this.logger.warn(
          `No se pudo encolar la generación de PDF/QR del documento ${fiscalDocumentId}; queda pendiente para recuperación. ${
            enqueueError instanceof Error
              ? enqueueError.message
              : String(enqueueError)
          }`,
        );
      }
    }

    return result;
  }

  getWorker(): Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult> | null {
    return this.worker;
  }
}

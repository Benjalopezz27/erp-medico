import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan } from 'typeorm';
import { ArcaStatus } from '@erp/shared-types';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { FiscalInvoiceQueueService } from './fiscal-invoice.queue';

/**
 * Recovers `FiscalDocument` rows stuck in `PENDIENTE_FACTURACION` without an
 * active `wsfe-emit` job — a failed post-commit enqueue, or a worker
 * restart. Runs once on boot and then on a fixed interval; each run is
 * bounded by age (grace period) and batch size so it never floods Redis —
 * whatever doesn't fit in one run is picked up by the next one, since
 * `updatedAt` doesn't change until the document is actually processed.
 * See openspec/changes/arca-contingency-engine/design.md decision D3.
 */
@Injectable()
export class FiscalReconciliationSweepService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(FiscalReconciliationSweepService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly queueService: FiscalInvoiceQueueService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    void this.sweep();
    this.intervalHandle = setInterval(
      () => {
        void this.sweep();
      },
      this.numberEnv('ARCA_SWEEP_INTERVAL_MS', 300_000),
    );
    this.intervalHandle.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Returns how many orphaned documents were re-enqueued this run. */
  async sweep(): Promise<number> {
    const graceMs = this.numberEnv('ARCA_SWEEP_GRACE_PERIOD_MS', 120_000);
    const batchSize = this.numberEnv('ARCA_SWEEP_BATCH_SIZE', 50);
    const cutoff = new Date(Date.now() - graceMs);

    let pending: FiscalDocument[];
    try {
      pending = await this.dataSource.getRepository(FiscalDocument).find({
        where: {
          arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
          updatedAt: LessThan(cutoff),
        },
        order: { updatedAt: 'ASC' },
        take: batchSize,
      });
    } catch (err) {
      this.logger.warn(
        `[Sweep] No se pudo consultar documentos pendientes: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return 0;
    }

    let requeued = 0;
    for (const document of pending) {
      try {
        const result = await this.queueService.requeue(document.id);
        if (result.created) {
          requeued += 1;
          this.logger.log(
            `[Sweep] Re-encolado documento huérfano ${document.id} (jobId ${result.jobId}).`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `[Sweep] No se pudo re-encolar documento ${document.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return requeued;
  }

  private numberEnv(key: string, fallback: number): number {
    const raw = Number(this.configService.get<string | number>(key));
    return !raw || Number.isNaN(raw) || raw <= 0 ? fallback : raw;
  }
}

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FiscalDocumentType } from '@erp/shared-types';
import { FiscalDocument } from '../entities/fiscal-document.entity';

/**
 * Reserves the next comprobante number for a (documentType, pointOfSale)
 * combination, serialized with a Postgres advisory lock so two concurrent
 * workers never compute the same number. The reserved number is persisted on
 * the FiscalDocument row (still PENDIENTE_FACTURACION) BEFORE the caller
 * invokes ARCA, so a request whose result becomes uncertain (timeout, crash)
 * still leaves a number US27-A can reconcile via FECompConsultar.
 */
@Injectable()
export class FiscalNumberingService {
  constructor(private readonly dataSource: DataSource) {}

  async reserveNextNumber(
    fiscalDocumentId: string,
    documentType: FiscalDocumentType,
    pointOfSale: number,
    getLastAuthorized: () => Promise<number>,
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    const lockKey = `${documentType}:${pointOfSale}`;

    try {
      await queryRunner.query('SELECT pg_advisory_lock(hashtext($1)::bigint)', [
        lockKey,
      ]);

      const lastAuthorized = await getLastAuthorized();
      const nextNumber = lastAuthorized + 1;

      await queryRunner.manager
        .getRepository(FiscalDocument)
        .update({ id: fiscalDocumentId }, { documentNumber: nextNumber });

      return nextNumber;
    } finally {
      await queryRunner.query(
        'SELECT pg_advisory_unlock(hashtext($1)::bigint)',
        [lockKey],
      );
      await queryRunner.release();
    }
  }
}

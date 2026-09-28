import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
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

  /**
   * When `manager` is provided, the advisory lock and the number update run
   * on ITS connection instead of a new one. Required when the caller already
   * holds a pessimistic row lock on the same FiscalDocument (e.g. the
   * wsfe-emit processor): updating that row from a second connection would
   * block on the caller's own lock until it releases, i.e. self-deadlock.
   */
  async reserveNextNumber(
    fiscalDocumentId: string,
    documentType: FiscalDocumentType,
    pointOfSale: number,
    getLastAuthorized: () => Promise<number>,
    manager?: EntityManager,
  ): Promise<number> {
    if (manager) {
      return this.reserveWithManager(
        manager,
        fiscalDocumentId,
        documentType,
        pointOfSale,
        getLastAuthorized,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      return await this.reserveWithManager(
        queryRunner.manager,
        fiscalDocumentId,
        documentType,
        pointOfSale,
        getLastAuthorized,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async reserveWithManager(
    manager: EntityManager,
    fiscalDocumentId: string,
    documentType: FiscalDocumentType,
    pointOfSale: number,
    getLastAuthorized: () => Promise<number>,
  ): Promise<number> {
    const lockKey = `${documentType}:${pointOfSale}`;

    await manager.query('SELECT pg_advisory_lock(hashtext($1)::bigint)', [
      lockKey,
    ]);

    try {
      const lastAuthorized = await getLastAuthorized();
      const nextNumber = lastAuthorized + 1;

      await manager
        .getRepository(FiscalDocument)
        .update({ id: fiscalDocumentId }, { documentNumber: nextNumber });

      return nextNumber;
    } finally {
      await manager.query('SELECT pg_advisory_unlock(hashtext($1)::bigint)', [
        lockKey,
      ]);
    }
  }
}

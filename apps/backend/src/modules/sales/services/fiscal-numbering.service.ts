import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FiscalDocumentType } from '@erp/shared-types';
import { FiscalDocument } from '../entities/fiscal-document.entity';

/**
 * Reserves the next comprobante number for a (documentType, pointOfSale)
 * combination. The lock is a transaction-scoped Postgres advisory lock
 * (`pg_advisory_xact_lock`), so it stays held until the caller's transaction
 * commits — i.e. through `requestCAE` and the EMITIDO persist. ARCA only
 * advances `FECompUltimoAutorizado` when it authorizes, so releasing the lock
 * earlier lets a second worker read the same "last authorized" and reserve
 * the same N+1.
 *
 * The reserved number is persisted on the FiscalDocument row (still
 * PENDIENTE_FACTURACION) BEFORE the caller invokes ARCA, so a request whose
 * result becomes uncertain (timeout, crash) still leaves a number US27-A can
 * reconcile via FECompConsultar.
 */
@Injectable()
export class FiscalNumberingService {
  /**
   * `manager` MUST be the caller's transaction manager: outside a
   * transaction an xact lock is released at the end of its own statement.
   * It also runs on the caller's connection, avoiding a self-deadlock with
   * the row lock the caller already holds on the FiscalDocument.
   */
  async reserveNextNumber(
    fiscalDocumentId: string,
    documentType: FiscalDocumentType,
    pointOfSale: number,
    getLastAuthorized: () => Promise<number>,
    manager: EntityManager,
  ): Promise<number> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
      `${documentType}:${pointOfSale}`,
    ]);

    const lastAuthorized = await getLastAuthorized();

    // Numbers reserved by documents still awaiting ARCA (retrying, or
    // uncertain) are not yet visible in `lastAuthorized`: skip past them.
    const [{ max }] = await manager.query<[{ max: number | null }]>(
      `SELECT MAX(document_number) AS max FROM fiscal_documents
       WHERE document_type = $1 AND point_of_sale = $2
         AND arca_status = 'PENDIENTE_FACTURACION' AND id <> $3`,
      [documentType, pointOfSale, fiscalDocumentId],
    );
    const nextNumber = Math.max(lastAuthorized, max ?? 0) + 1;

    await manager
      .getRepository(FiscalDocument)
      .update(
        { id: fiscalDocumentId },
        { documentNumber: nextNumber, documentType, pointOfSale },
      );

    return nextNumber;
  }
}

import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

const POINT_OF_SALE = 1;

@Injectable()
export class ReceiptNumberService {
  /**
   * Toma el próximo número de recibo. El UPDATE bloquea la fila del contador
   * hasta el commit, así que dos cobros se serializan y un rollback devuelve
   * el número (una secuencia de PostgreSQL dejaría huecos).
   */
  async next(manager: EntityManager): Promise<string> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error(
        'ReceiptNumberService.next requires an active transaction.',
      );
    }
    const [rows] = (await manager.query(
      `UPDATE "receipt_counters" SET "last_number" = "last_number" + 1
       WHERE "point_of_sale" = $1 RETURNING "last_number"`,
      [POINT_OF_SALE],
    )) as [{ last_number: number }[], number];
    if (rows.length === 0) {
      throw new Error(
        `Receipt counter for point of sale ${POINT_OF_SALE} is not seeded.`,
      );
    }
    return `${String(POINT_OF_SALE).padStart(4, '0')}-${String(rows[0].last_number).padStart(8, '0')}`;
  }
}

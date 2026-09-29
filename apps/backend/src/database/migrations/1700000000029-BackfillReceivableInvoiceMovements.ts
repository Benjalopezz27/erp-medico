import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillReceivableInvoiceMovements1700000000029 implements MigrationInterface {
  name = 'BackfillReceivableInvoiceMovements1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_arm_factura_per_ar"
      ON "account_receivable_movements" ("account_receivable_id")
      WHERE "movement_type" = 'FACTURA'
    `);

    await queryRunner.query(`
      INSERT INTO "account_receivable_movements" (
        "account_receivable_id", "movement_type", "amount",
        "previous_balance", "subsequent_balance",
        "fiscal_document_id", "user_id", "created_at"
      )
      SELECT ar."id", 'FACTURA', ar."original_amount",
             0, ar."original_amount",
             ar."fiscal_document_id", s."user_id", ar."created_at"
      FROM "account_receivables" ar
      JOIN "sales" s ON s."id" = ar."sale_id"
      WHERE ar."original_amount" > 0
        AND NOT EXISTS (
          SELECT 1 FROM "account_receivable_movements" m
          WHERE m."account_receivable_id" = ar."id"
            AND m."movement_type" = 'FACTURA'
        )
    `);
  }

  // Solo para entornos locales: en staging/producción borra también los
  // FACTURA escritos por la aplicación después del backfill.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "account_receivable_movements" WHERE "movement_type" = 'FACTURA'`,
    );
    await queryRunner.query(`DROP INDEX "UQ_arm_factura_per_ar"`);
  }
}

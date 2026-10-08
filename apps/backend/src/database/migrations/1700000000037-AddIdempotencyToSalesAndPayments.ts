import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdempotencyToSalesAndPayments1700000000037 implements MigrationInterface {
  name = 'AddIdempotencyToSalesAndPayments1700000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['sales', 'payments']) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(100),
          ADD COLUMN IF NOT EXISTS "request_hash" varchar(64)
      `);
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_${table}_idempotency"
        ON "${table}" ("user_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['sales', 'payments']) {
      await queryRunner.query(`DROP INDEX IF EXISTS "UQ_${table}_idempotency"`);
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "request_hash",
          DROP COLUMN IF EXISTS "idempotency_key"
      `);
    }
  }
}

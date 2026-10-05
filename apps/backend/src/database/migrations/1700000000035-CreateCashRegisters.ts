import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashRegisters1700000000035 implements MigrationInterface {
  name = 'CreateCashRegisters1700000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_registers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "opened_at" timestamptz NOT NULL DEFAULT now(),
        "opened_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "opening_balance" numeric(14,2) NOT NULL,
        "closed_at" timestamptz,
        "closed_by" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
        "expected_balance" numeric(14,2),
        "actual_balance" numeric(14,2),
        "difference" numeric(14,2),
        "observation" varchar(500),
        CONSTRAINT "CHK_cash_registers_opening" CHECK ("opening_balance" >= 0),
        CONSTRAINT "CHK_cash_registers_actual" CHECK ("actual_balance" IS NULL OR "actual_balance" >= 0),
        CONSTRAINT "CHK_cash_registers_closed" CHECK (
          ("closed_at" IS NULL AND "actual_balance" IS NULL)
          OR ("closed_at" IS NOT NULL AND "actual_balance" IS NOT NULL
              AND "expected_balance" IS NOT NULL AND "difference" IS NOT NULL)
        )
      )
    `);
    // Una sola caja abierta a la vez.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cash_registers_single_open"
      ON "cash_registers" ((true)) WHERE "closed_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_registers"`);
  }
}

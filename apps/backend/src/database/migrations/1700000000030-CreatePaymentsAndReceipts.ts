import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsAndReceipts1700000000030 implements MigrationInterface {
  name = 'CreatePaymentsAndReceipts1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "total_amount" numeric(14,2) NOT NULL,
        "payment_method" varchar(30) NOT NULL,
        "notes" varchar(500),
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_payments_total_positive" CHECK ("total_amount" > 0),
        CONSTRAINT "FK_payments_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_customer" ON "payments" ("customer_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_allocations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "account_receivable_id" uuid NOT NULL,
        "amount_allocated" numeric(14,2) NOT NULL,
        "allocation_type" varchar(20) NOT NULL,
        CONSTRAINT "CHK_payment_allocations_amount_positive" CHECK ("amount_allocated" > 0),
        CONSTRAINT "UQ_payment_allocations_payment_ar" UNIQUE ("payment_id", "account_receivable_id"),
        CONSTRAINT "FK_payment_allocations_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_payment_allocations_ar" FOREIGN KEY ("account_receivable_id") REFERENCES "account_receivables"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "receipt_number" varchar(20) NOT NULL,
        "payment_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "total_amount" numeric(14,2) NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_receipts_number" UNIQUE ("receipt_number"),
        CONSTRAINT "UQ_receipts_payment" UNIQUE ("payment_id"),
        CONSTRAINT "FK_receipts_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_receipts_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_receipts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "receipt_counters" (
        "point_of_sale" integer PRIMARY KEY,
        "last_number" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(
      `INSERT INTO "receipt_counters" ("point_of_sale", "last_number") VALUES (1, 0) ON CONFLICT DO NOTHING`,
    );

    await queryRunner.query(`
      ALTER TABLE "account_receivable_movements"
      ADD COLUMN IF NOT EXISTS "payment_id" uuid,
      ADD CONSTRAINT "FK_arm_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT
    `);
  }

  // Solo válido antes de que existan cobros reales: borra pagos y recibos.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account_receivable_movements" DROP CONSTRAINT "FK_arm_payment", DROP COLUMN "payment_id"`,
    );
    await queryRunner.query(`DROP TABLE "receipt_counters"`);
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP TABLE "payment_allocations"`);
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}

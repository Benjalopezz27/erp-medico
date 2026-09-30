import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChecks1700000000031 implements MigrationInterface {
  name = 'CreateChecks1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'REGISTRADO'
    `);
    await queryRunner.query(`
      ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "CHK_payments_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "CHK_payments_status" CHECK ("status" IN ('REGISTRADO','REVERTIDO'))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "checks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "bank_name" varchar(100) NOT NULL,
        "check_number" varchar(30) NOT NULL,
        "drawer_name" varchar(150) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "issue_date" date,
        "due_date" date NOT NULL,
        "received_date" date NOT NULL DEFAULT CURRENT_DATE,
        "status" varchar(20) NOT NULL DEFAULT 'RECIBIDO',
        "endorsed_to_supplier_id" uuid,
        "rejected_at" timestamptz,
        "rejection_reason" varchar(500),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_checks_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "CHK_checks_status" CHECK ("status" IN ('RECIBIDO','EN_CARTERA','DEPOSITADO','ENDOSADO','RECHAZADO')),
        CONSTRAINT "UQ_checks_payment" UNIQUE ("payment_id"),
        CONSTRAINT "UQ_checks_bank_number" UNIQUE ("bank_name", "check_number"),
        CONSTRAINT "FK_checks_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_checks_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_checks_supplier" FOREIGN KEY ("endorsed_to_supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_checks_status" ON "checks" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_checks_due_date" ON "checks" ("due_date")`,
    );
  }

  // Solo válido antes de que existan cheques reales: borra la tabla checks.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checks"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "CHK_payments_status", DROP COLUMN "status"`,
    );
  }
}

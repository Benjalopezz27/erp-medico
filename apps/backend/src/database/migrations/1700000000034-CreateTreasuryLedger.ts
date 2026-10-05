import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTreasuryLedger1700000000034 implements MigrationInterface {
  name = 'CreateTreasuryLedger1700000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "treasury_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "account_type" varchar(20) NOT NULL,
        "name" varchar(60) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_treasury_accounts_type" UNIQUE ("account_type"),
        CONSTRAINT "CHK_treasury_accounts_type"
          CHECK ("account_type" IN ('EFECTIVO','BANCOS','CHEQUES_CARTERA'))
      )
    `);
    await queryRunner.query(`
      INSERT INTO "treasury_accounts" ("account_type", "name") VALUES
        ('EFECTIVO', 'Efectivo'),
        ('BANCOS', 'Bancos / Transferencias'),
        ('CHEQUES_CARTERA', 'Cheques en Cartera')
      ON CONFLICT ("account_type") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "treasury_movements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "treasury_account_id" uuid NOT NULL REFERENCES "treasury_accounts"("id") ON DELETE RESTRICT,
        "movement_type" varchar(10) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "concept" varchar(200) NOT NULL,
        "reference_type" varchar(30),
        "reference_id" uuid,
        "user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_treasury_movements_type" CHECK ("movement_type" IN ('INGRESO','EGRESO')),
        CONSTRAINT "CHK_treasury_movements_amount" CHECK ("amount" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_treasury_movements_account_date"
      ON "treasury_movements" ("treasury_account_id", "created_at" DESC)
    `);

    // El libro es append-only: un bug de aplicación no puede reescribirlo.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "treasury_movements_immutable"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'treasury_movements es inmutable (% no permitido)', TG_OP;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "TRG_treasury_movements_immutable" ON "treasury_movements"
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_treasury_movements_immutable"
      BEFORE UPDATE OR DELETE ON "treasury_movements"
      FOR EACH ROW EXECUTE FUNCTION "treasury_movements_immutable"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_treasury_movements_immutable" ON "treasury_movements"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "treasury_movements_immutable"()`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "treasury_movements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "treasury_accounts"`);
  }
}

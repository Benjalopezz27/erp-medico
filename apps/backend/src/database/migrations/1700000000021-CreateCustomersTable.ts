import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersTable1700000000021 implements MigrationInterface {
  name = 'CreateCustomersTable1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_name" varchar(200) NOT NULL,
        "document_type" varchar(20) NOT NULL,
        "cuit_or_dni" varchar(11) NOT NULL,
        "tax_condition" varchar(50) NOT NULL,
        "email" varchar(255),
        "phone" varchar(50),
        "address" varchar(255),
        "credit_limit" numeric(14,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customers_document" UNIQUE ("cuit_or_dni"),
        CONSTRAINT "CHK_customers_business_name" CHECK (char_length(btrim("business_name")) BETWEEN 2 AND 200),
        CONSTRAINT "CHK_customers_document_type" CHECK ("document_type" IN ('DNI', 'CUIT')),
        CONSTRAINT "CHK_customers_document_format" CHECK (
          ("document_type" = 'DNI' AND "cuit_or_dni" ~ '^[0-9]{7,8}$' AND "cuit_or_dni" !~ '^0+$') OR
          ("document_type" = 'CUIT' AND "cuit_or_dni" ~ '^[0-9]{11}$')
        ),
        CONSTRAINT "CHK_customers_tax_condition" CHECK ("tax_condition" IN ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL')),
        CONSTRAINT "CHK_customers_document_tax" CHECK ("document_type" = 'CUIT' OR "tax_condition" = 'CONSUMIDOR_FINAL'),
        CONSTRAINT "CHK_customers_credit_limit" CHECK ("credit_limit" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_active_created" ON "customers" ("is_active", "created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_tax_condition" ON "customers" ("tax_condition")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customers_business_name_lower" ON "customers" (LOWER("business_name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}

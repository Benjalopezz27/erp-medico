import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalesFiscalAndReceivablesTables1700000000023 implements MigrationInterface {
  name = 'CreateSalesFiscalAndReceivablesTables1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "iva_percentage" numeric(5,2) NOT NULL DEFAULT 21.00,
      ADD CONSTRAINT "CHK_products_iva_percentage" CHECK ("iva_percentage" BETWEEN 0 AND 100)
    `);
    await queryRunner.query(`UPDATE "products" SET "iva_percentage" = 21.00`);
    await queryRunner.query(
      `CREATE SEQUENCE "sale_number_seq" START WITH 1 INCREMENT BY 1`,
    );
    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sale_number" varchar(30) NOT NULL,
        "customer_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'BORRADOR',
        "is_credit_sale" boolean NOT NULL DEFAULT false,
        "requires_fiscal_invoice" boolean NOT NULL DEFAULT false,
        "payment_method" varchar(30) NOT NULL,
        "total_net" numeric(14,2) NOT NULL DEFAULT 0,
        "iva_total" numeric(14,2) NOT NULL DEFAULT 0,
        "total_gross" numeric(14,2) NOT NULL DEFAULT 0,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sales_number" UNIQUE ("sale_number"),
        CONSTRAINT "CHK_sales_status" CHECK ("status" IN ('BORRADOR','CONFIRMADA','CANCELADA')),
        CONSTRAINT "CHK_sales_totals" CHECK ("total_net" >= 0 AND "iva_total" >= 0 AND "total_gross" >= 0),
        CONSTRAINT "CHK_sales_credit_contract" CHECK (
          ("is_credit_sale" = true AND "customer_id" IS NOT NULL AND "requires_fiscal_invoice" = true AND "payment_method" = 'CTA_CTE') OR
          ("is_credit_sale" = false AND "payment_method" <> 'CTA_CTE')
        ),
        CONSTRAINT "FK_sales_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sales_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sale_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "item_index" integer NOT NULL,
        "quantity_base" numeric(14,2) NOT NULL,
        "catalog_price_net" numeric(14,2) NOT NULL,
        "pricing_rule_applied" varchar(30) NOT NULL,
        "pricing_rule_id" uuid,
        "discount_percentage" numeric(7,4),
        "discount_amount_net" numeric(14,2) NOT NULL,
        "unit_price_net" numeric(14,2) NOT NULL,
        "subtotal_net" numeric(14,2) NOT NULL,
        "iva_percentage" numeric(5,2) NOT NULL,
        "iva_amount" numeric(14,2) NOT NULL,
        "subtotal_gross" numeric(14,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sale_items_product" UNIQUE ("sale_id", "product_id"),
        CONSTRAINT "CHK_sale_items_values" CHECK (
          "quantity_base" > 0 AND "catalog_price_net" >= 0 AND "discount_amount_net" >= 0 AND
          "unit_price_net" >= 0 AND "subtotal_net" >= 0 AND "iva_percentage" BETWEEN 0 AND 100 AND
          "iva_amount" >= 0 AND "subtotal_gross" >= 0 AND
          ("discount_percentage" IS NULL OR "discount_percentage" BETWEEN 0 AND 100)
        ),
        CONSTRAINT "FK_sale_items_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sale_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "fiscal_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL,
        "document_type" varchar(30),
        "point_of_sale" integer,
        "document_number" integer,
        "cae" varchar(20),
        "cae_expiration_date" date,
        "arca_status" varchar(30) NOT NULL DEFAULT 'PENDIENTE_FACTURACION',
        "arca_error_message" text,
        "qr_code_data" text,
        "issued_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fiscal_documents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fiscal_documents_sale" UNIQUE ("sale_id"),
        CONSTRAINT "CHK_fiscal_documents_status" CHECK ("arca_status" IN ('EMITIDO','PENDIENTE_FACTURACION','RECHAZADO')),
        CONSTRAINT "FK_fiscal_documents_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "account_receivables" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "sale_id" uuid NOT NULL,
        "fiscal_document_id" uuid NOT NULL,
        "document_reference" varchar(100) NOT NULL,
        "original_amount" numeric(14,2) NOT NULL,
        "current_balance" numeric(14,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDIENTE',
        "due_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_receivables" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_account_receivables_sale" UNIQUE ("sale_id"),
        CONSTRAINT "UQ_account_receivables_fiscal" UNIQUE ("fiscal_document_id"),
        CONSTRAINT "CHK_account_receivables_amounts" CHECK ("original_amount" >= 0 AND "current_balance" >= 0 AND "current_balance" <= "original_amount"),
        CONSTRAINT "CHK_account_receivables_status" CHECK ("status" IN ('PENDIENTE','PARCIAL','CANCELADO')),
        CONSTRAINT "FK_account_receivables_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_account_receivables_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_account_receivables_fiscal" FOREIGN KEY ("fiscal_document_id") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_created" ON "sales" ("created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_customer" ON "sales" ("customer_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_status" ON "sales" ("status", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_items_sale" ON "sale_items" ("sale_id", "item_index")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_account_receivables_customer" ON "account_receivables" ("customer_id", "status", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "account_receivables"`);
    await queryRunner.query(`DROP TABLE "fiscal_documents"`);
    await queryRunner.query(`DROP TABLE "sale_items"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP SEQUENCE "sale_number_seq"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "CHK_products_iva_percentage", DROP COLUMN "iva_percentage"`,
    );
  }
}

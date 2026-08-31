import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerReturnsAndAdaptQuarantine1700000000025 implements MigrationInterface {
  name = 'CreateCustomerReturnsAndAdaptQuarantine1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create sale_returns
    await queryRunner.query(`
      CREATE TABLE "sale_returns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "reason" varchar(255) NOT NULL,
        "taxable_net" numeric(14,2) NOT NULL DEFAULT 0.00,
        "exempt_amount" numeric(14,2) NOT NULL DEFAULT 0.00,
        "non_taxed_amount" numeric(14,2) NOT NULL DEFAULT 0.00,
        "total_net" numeric(14,2) NOT NULL,
        "iva_total" numeric(14,2) NOT NULL,
        "total_gross" numeric(14,2) NOT NULL,
        "idempotency_key" varchar(100),
        "request_hash" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_returns" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sale_returns_totals_non_negative" CHECK (
          "taxable_net" >= 0 AND "exempt_amount" >= 0 AND "non_taxed_amount" >= 0 AND
          "total_net" >= 0 AND "iva_total" >= 0 AND "total_gross" >= 0
        ),
        CONSTRAINT "CHK_sale_returns_total_net_sum" CHECK (
          "total_net" = "taxable_net" + "exempt_amount" + "non_taxed_amount"
        ),
        CONSTRAINT "CHK_sale_returns_total_gross_sum" CHECK (
          "total_gross" = "total_net" + "iva_total"
        ),
        CONSTRAINT "FK_sale_returns_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sale_returns_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_sale_returns_idempotency" 
      ON "sale_returns" ("sale_id", "idempotency_key") 
      WHERE "idempotency_key" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sale_returns_sale_id" ON "sale_returns" ("sale_id")
    `);

    // 2. Create sale_return_items
    await queryRunner.query(`
      CREATE TABLE "sale_return_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "sale_return_id" uuid NOT NULL,
        "sale_item_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "quantity_base" numeric(14,2) NOT NULL,
        "quality" varchar(20) NOT NULL,
        "unit_price_net" numeric(14,2) NOT NULL,
        "tax_treatment" varchar(20) NOT NULL,
        "iva_percentage" numeric(5,2),
        "subtotal_net" numeric(14,2) NOT NULL,
        "iva_amount" numeric(14,2) NOT NULL,
        "subtotal_gross" numeric(14,2) NOT NULL,
        "notes" text,
        "stock_movement_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_return_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_sale_return_items_qty_positive" CHECK ("quantity_base" > 0),
        CONSTRAINT "CHK_sale_return_items_quality" CHECK ("quality" IN ('APTO', 'NO_APTO')),
        CONSTRAINT "UQ_sale_return_items_product" UNIQUE ("sale_return_id", "sale_item_id"),
        CONSTRAINT "CHK_sale_return_items_tax" CHECK (
          ("tax_treatment" = 'GRAVADO' AND "iva_percentage" IN (0, 2.5, 5, 10.5, 21, 27)) OR
          ("tax_treatment" IN ('EXENTO', 'NO_GRAVADO') AND "iva_percentage" IS NULL AND "iva_amount" = 0)
        ),
        CONSTRAINT "FK_sale_return_items_return" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_return_items_sale_item" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sale_return_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sale_return_items_movement" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sale_return_items_sale_item_id" ON "sale_return_items" ("sale_item_id")
    `);

    // 3. Adapt quarantine_stocks
    await queryRunner.query(`
      ALTER TABLE "quarantine_stocks"
      ALTER COLUMN "entry_movement_id" DROP NOT NULL,
      ADD COLUMN "origin_type" varchar(50) NOT NULL DEFAULT 'AJUSTE_MANUAL',
      ADD COLUMN "sale_return_item_id" uuid,
      ADD CONSTRAINT "UQ_quarantine_stocks_sale_return_item" UNIQUE ("sale_return_item_id"),
      ADD CONSTRAINT "FK_quarantine_stocks_sale_return_item" FOREIGN KEY ("sale_return_item_id") REFERENCES "sale_return_items"("id") ON DELETE RESTRICT,
      ADD CONSTRAINT "CHK_quarantine_stocks_origin_consistency" CHECK (
        ("origin_type" = 'AJUSTE_MANUAL' AND "entry_movement_id" IS NOT NULL AND "sale_return_item_id" IS NULL) OR
        ("origin_type" = 'DEVOLUCION_CLIENTE' AND "entry_movement_id" IS NULL AND "sale_return_item_id" IS NOT NULL)
      )
    `);

    // 4. Adapt fiscal_documents
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      DROP CONSTRAINT "UQ_fiscal_documents_sale",
      ADD COLUMN "sale_return_id" uuid,
      ADD CONSTRAINT "UQ_fiscal_documents_sale_return" UNIQUE ("sale_return_id"),
      ADD CONSTRAINT "FK_fiscal_documents_sale_return" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_fiscal_documents_original_sale" 
      ON "fiscal_documents" ("sale_id") 
      WHERE "sale_return_id" IS NULL
    `);

    // 5. Create account_receivable_movements
    await queryRunner.query(`
      CREATE TABLE "account_receivable_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "account_receivable_id" uuid NOT NULL,
        "movement_type" varchar(50) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "previous_balance" numeric(14,2) NOT NULL,
        "subsequent_balance" numeric(14,2) NOT NULL,
        "fiscal_document_id" uuid,
        "sale_return_id" uuid,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_account_receivable_movements" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_arm_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "CHK_arm_balances_non_negative" CHECK ("previous_balance" >= 0 AND "subsequent_balance" >= 0),
        CONSTRAINT "FK_arm_account_receivable" FOREIGN KEY ("account_receivable_id") REFERENCES "account_receivables"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_arm_fiscal_document" FOREIGN KEY ("fiscal_document_id") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_arm_sale_return" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_arm_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_arm_sale_return" 
      ON "account_receivable_movements" ("sale_return_id") 
      WHERE "sale_return_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_arm_account_receivable" 
      ON "account_receivable_movements" ("account_receivable_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop account_receivable_movements
    await queryRunner.query(
      `DROP TABLE IF EXISTS "account_receivable_movements"`,
    );

    // Revert fiscal_documents
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_fiscal_documents_original_sale"`,
    );
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      DROP CONSTRAINT IF EXISTS "FK_fiscal_documents_sale_return",
      DROP CONSTRAINT IF EXISTS "UQ_fiscal_documents_sale_return",
      DROP COLUMN IF EXISTS "sale_return_id",
      ADD CONSTRAINT "UQ_fiscal_documents_sale" UNIQUE ("sale_id")
    `);

    // Revert quarantine_stocks
    await queryRunner.query(`
      ALTER TABLE "quarantine_stocks"
      DROP CONSTRAINT IF EXISTS "CHK_quarantine_stocks_origin_consistency",
      DROP CONSTRAINT IF EXISTS "FK_quarantine_stocks_sale_return_item",
      DROP CONSTRAINT IF EXISTS "UQ_quarantine_stocks_sale_return_item",
      DROP COLUMN IF EXISTS "sale_return_item_id",
      DROP COLUMN IF EXISTS "origin_type"
    `);
    await queryRunner.query(`
      UPDATE "quarantine_stocks" 
      SET "entry_movement_id" = '00000000-0000-0000-0000-000000000000' 
      WHERE "entry_movement_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "quarantine_stocks"
      ALTER COLUMN "entry_movement_id" SET NOT NULL
    `);

    // Drop sale_return_items and sale_returns
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_return_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_returns"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierCostAdjustmentsAndPriceReviews1700000000018 implements MigrationInterface {
  name = 'CreateSupplierCostAdjustmentsAndPriceReviews1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "supplier_invoices"
      ADD COLUMN "confirmed_by_user_id" uuid NULL,
      ADD COLUMN "confirmed_at" timestamptz NULL,
      ADD CONSTRAINT "CHK_supplier_invoice_confirmation_metadata" CHECK (
        ("confirmed_by_user_id" IS NULL AND "confirmed_at" IS NULL) OR
        ("confirmed_by_user_id" IS NOT NULL AND "confirmed_at" IS NOT NULL)
      ),
      ADD CONSTRAINT "FK_supplier_invoice_confirmed_by" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE TABLE "supplier_cost_adjustments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_invoice_id" uuid NOT NULL,
        "supplier_invoice_item_id" uuid NOT NULL,
        "goods_receipt_id" uuid NOT NULL,
        "goods_receipt_item_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "stock_movement_id" uuid NOT NULL,
        "product_code_snapshot" varchar(50) NOT NULL,
        "product_name_snapshot" varchar(200) NOT NULL,
        "provisional_cost_purchase_unit_net" numeric(24,4) NOT NULL,
        "real_cost_purchase_unit_net" numeric(24,4) NOT NULL,
        "conversion_factor" numeric(10,4) NOT NULL,
        "provisional_cost_base_unit_net" numeric(24,4) NOT NULL,
        "real_cost_base_unit_net" numeric(24,4) NOT NULL,
        "cost_difference_unit_net" numeric(24,4) NOT NULL,
        "invoiced_qty_base" numeric(14,2) NOT NULL,
        "layer_start_qty_base" numeric(14,2) NOT NULL,
        "layer_end_qty_base" numeric(14,2) NOT NULL,
        "on_hand_allocated_qty" numeric(14,2) NOT NULL,
        "consumed_allocated_qty" numeric(14,2) NOT NULL,
        "stock_revaluation" numeric(24,4) NOT NULL,
        "cogs_adjustment" numeric(24,4) NOT NULL,
        "previous_product_cost_net" numeric(12,4) NOT NULL,
        "new_product_cost_net" numeric(12,4) NOT NULL,
        "applied_by_user_id" uuid NOT NULL,
        "applied_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_cost_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supplier_cost_adjustment_invoice_item" UNIQUE ("supplier_invoice_item_id"),
        CONSTRAINT "CHK_supplier_cost_adjustment_costs" CHECK (
          "provisional_cost_purchase_unit_net" >= 0 AND "real_cost_purchase_unit_net" >= 0 AND
          "conversion_factor" > 0 AND "provisional_cost_base_unit_net" >= 0 AND "real_cost_base_unit_net" >= 0 AND
          "previous_product_cost_net" >= 0 AND "new_product_cost_net" >= 0
        ),
        CONSTRAINT "CHK_supplier_cost_adjustment_quantities" CHECK (
          "invoiced_qty_base" >= 0 AND "layer_start_qty_base" >= 0 AND
          "layer_end_qty_base" >= "layer_start_qty_base" AND
          "layer_end_qty_base" = "layer_start_qty_base" + "invoiced_qty_base" AND
          "on_hand_allocated_qty" >= 0 AND "consumed_allocated_qty" >= 0 AND
          "on_hand_allocated_qty" + "consumed_allocated_qty" = "invoiced_qty_base"
        ),
        CONSTRAINT "FK_supplier_cost_adjustment_invoice" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_invoice_item" FOREIGN KEY ("supplier_invoice_item_id") REFERENCES "supplier_invoice_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_receipt" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_receipt_item" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_movement" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_cost_adjustment_user" FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_cost_adjustment_invoice" ON "supplier_cost_adjustments" ("supplier_invoice_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_cost_adjustment_receipt_item" ON "supplier_cost_adjustments" ("goods_receipt_item_id", "applied_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_cost_adjustment_product" ON "supplier_cost_adjustments" ("product_id")`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_supplier_cost_adjustment_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Supplier cost adjustments are immutable. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_supplier_cost_adjustment_modification
      BEFORE UPDATE OR DELETE ON "supplier_cost_adjustments"
      FOR EACH ROW EXECUTE FUNCTION prevent_supplier_cost_adjustment_modification()
    `);

    await queryRunner.query(`
      CREATE TABLE "price_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_invoice_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "product_code_snapshot" varchar(50) NOT NULL,
        "product_name_snapshot" varchar(200) NOT NULL,
        "previous_cost_net" numeric(12,4) NOT NULL,
        "new_cost_net" numeric(12,4) NOT NULL,
        "markup_percentage_snapshot" numeric(8,4) NULL,
        "previous_suggested_price_net" numeric(12,2) NOT NULL,
        "suggested_price_net" numeric(12,2) NOT NULL,
        "active_price_net_snapshot" numeric(12,2) NOT NULL,
        "approved_price_net" numeric(12,2) NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDIENTE',
        "reviewed_by_user_id" uuid NULL,
        "reviewed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_price_review_invoice_product" UNIQUE ("supplier_invoice_id", "product_id"),
        CONSTRAINT "CHK_price_review_status" CHECK ("status" IN ('PENDIENTE','APROBADO','RECHAZADO','POSPUESTO')),
        CONSTRAINT "CHK_price_review_values" CHECK (
          "previous_cost_net" >= 0 AND "new_cost_net" >= 0 AND
          ("markup_percentage_snapshot" IS NULL OR "markup_percentage_snapshot" BETWEEN 0 AND 1000) AND
          "previous_suggested_price_net" >= 0 AND "suggested_price_net" >= 0 AND
          "active_price_net_snapshot" >= 0 AND ("approved_price_net" IS NULL OR "approved_price_net" >= 0)
        ),
        CONSTRAINT "CHK_price_review_decision" CHECK (
          ("reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL) OR
          ("reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
        ),
        CONSTRAINT "FK_price_review_invoice" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_price_review_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_price_review_user" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_price_review_status_created" ON "price_reviews" ("status", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_price_review_product" ON "price_reviews" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "price_reviews"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_prevent_supplier_cost_adjustment_modification ON "supplier_cost_adjustments"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_supplier_cost_adjustment_modification()`,
    );
    await queryRunner.query(`DROP TABLE "supplier_cost_adjustments"`);
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "FK_supplier_invoice_confirmed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "CHK_supplier_invoice_confirmation_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP COLUMN "confirmed_at", DROP COLUMN "confirmed_by_user_id"`,
    );
  }
}

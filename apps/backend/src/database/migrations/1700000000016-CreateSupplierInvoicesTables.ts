import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplierInvoicesTables1700000000016 implements MigrationInterface {
  name = 'CreateSupplierInvoicesTables1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "supplier_invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_number" varchar(50) NOT NULL,
        "invoice_number_normalized" varchar(50) NOT NULL,
        "supplier_id" uuid NOT NULL,
        "goods_receipt_id" uuid NOT NULL,
        "purchase_order_id" uuid NOT NULL,
        "invoice_date" date NOT NULL,
        "status" varchar(30) NOT NULL,
        "net_total" numeric(24,4) NOT NULL,
        "tax_total" numeric(24,4) NOT NULL,
        "total_amount" numeric(24,4) NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supplier_invoice_number" UNIQUE ("supplier_id", "invoice_number_normalized"),
        CONSTRAINT "CHK_supplier_invoice_status" CHECK ("status" IN ('BORRADOR','VALIDANDO','OBSERVADA','AUTORIZADA','RECHAZADA','CONFIRMADA')),
        CONSTRAINT "CHK_supplier_invoice_totals" CHECK ("net_total" >= 0 AND "tax_total" >= 0 AND "total_amount" >= 0),
        CONSTRAINT "FK_supplier_invoice_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_receipt" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_supplier" ON "supplier_invoices" ("supplier_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_receipt" ON "supplier_invoices" ("goods_receipt_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_order" ON "supplier_invoices" ("purchase_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_status" ON "supplier_invoices" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_date" ON "supplier_invoices" ("invoice_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_created" ON "supplier_invoices" ("created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "supplier_invoice_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplier_invoice_id" uuid NOT NULL,
        "item_index" integer NOT NULL,
        "goods_receipt_item_id" uuid NOT NULL,
        "purchase_order_item_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "purchase_unit_id" uuid NOT NULL,
        "product_code_snapshot" varchar(50) NOT NULL,
        "product_name_snapshot" varchar(200) NOT NULL,
        "purchase_unit_name_snapshot" varchar(50) NOT NULL,
        "purchase_unit_symbol_snapshot" varchar(20) NOT NULL,
        "conversion_factor_snapshot" numeric(10,4) NOT NULL,
        "received_qty_purchase_unit" numeric(12,4) NOT NULL,
        "previously_allocated_qty_purchase_unit" numeric(12,4) NOT NULL,
        "available_qty_before" numeric(12,4) NOT NULL,
        "invoiced_qty_purchase_unit" numeric(12,4) NOT NULL,
        "allocated_received_qty_purchase_unit" numeric(12,4) NOT NULL,
        "allocated_received_qty_base" numeric(14,2) NOT NULL,
        "pending_qty_after" numeric(12,4) NOT NULL,
        "quantity_excess" numeric(12,4) NOT NULL,
        "quantity_status" varchar(20) NOT NULL,
        "provisional_cost_unit_net" numeric(12,4) NOT NULL,
        "unit_price_net" numeric(12,4) NOT NULL,
        "discount_net" numeric(24,4) NOT NULL,
        "bonus_net" numeric(24,4) NOT NULL,
        "surcharge_net" numeric(24,4) NOT NULL,
        "real_cost_unit_net" numeric(24,4) NOT NULL,
        "line_net_total" numeric(24,4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_invoice_items" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_supplier_invoice_receipt_item" UNIQUE ("supplier_invoice_id", "goods_receipt_item_id"),
        CONSTRAINT "UQ_supplier_invoice_item_index" UNIQUE ("supplier_invoice_id", "item_index"),
        CONSTRAINT "CHK_supplier_invoice_item_quantity_status" CHECK ("quantity_status" IN ('EXACTA','PARCIAL','EXCEDIDA')),
        CONSTRAINT "CHK_supplier_invoice_item_quantities" CHECK (
          "received_qty_purchase_unit" > 0 AND "invoiced_qty_purchase_unit" > 0 AND
          "previously_allocated_qty_purchase_unit" >= 0 AND "available_qty_before" >= 0 AND
          "allocated_received_qty_purchase_unit" >= 0 AND "allocated_received_qty_purchase_unit" <= "invoiced_qty_purchase_unit" AND
          "allocated_received_qty_base" >= 0 AND "pending_qty_after" >= 0 AND "quantity_excess" >= 0
        ),
        CONSTRAINT "CHK_supplier_invoice_item_costs" CHECK (
          "conversion_factor_snapshot" > 0 AND "provisional_cost_unit_net" >= 0 AND "unit_price_net" >= 0 AND
          "discount_net" >= 0 AND "bonus_net" >= 0 AND "surcharge_net" >= 0 AND
          "real_cost_unit_net" >= 0 AND "line_net_total" >= 0
        ),
        CONSTRAINT "FK_supplier_invoice_item_invoice" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_item_receipt_item" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_item_order_item" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_item_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_supplier_invoice_item_unit" FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_item_invoice" ON "supplier_invoice_items" ("supplier_invoice_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_item_receipt_item" ON "supplier_invoice_items" ("goods_receipt_item_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_invoice_item_product" ON "supplier_invoice_items" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "supplier_invoice_items"`);
    await queryRunner.query(`DROP TABLE "supplier_invoices"`);
  }
}

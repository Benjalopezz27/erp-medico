import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGoodsReceiptsTables1700000000015 implements MigrationInterface {
  name = 'CreateGoodsReceiptsTables1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Sequence for concurrent-safe goods receipt numbering (max 6 digits)
    await queryRunner.query(`
      CREATE SEQUENCE "goods_receipt_number_seq"
        AS integer
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 999999
        START WITH 1
        NO CYCLE;
    `);

    // 2. Create Table: goods_receipts
    await queryRunner.query(`
      CREATE TABLE "goods_receipts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "receipt_number" varchar(30) NOT NULL DEFAULT ('REC-' || LPAD(nextval('goods_receipt_number_seq')::text, 6, '0')),
        "purchase_order_id" uuid NOT NULL,
        "supplier_id" uuid NOT NULL,
        "delivery_note_number" varchar(50) NOT NULL,
        "delivery_note_normalized" varchar(50) NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_goods_receipts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_goods_receipts_receipt_number" UNIQUE ("receipt_number"),
        CONSTRAINT "UQ_goods_receipts_supplier_delivery_note_normalized" UNIQUE ("supplier_id", "delivery_note_normalized"),
        CONSTRAINT "FK_goods_receipts_purchase_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipts_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_goods_receipts_delivery_note_normalized" CHECK (length(trim("delivery_note_normalized")) > 0)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipts_purchase_order_id" ON "goods_receipts" ("purchase_order_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipts_supplier_id" ON "goods_receipts" ("supplier_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipts_created_at" ON "goods_receipts" ("created_at" DESC);`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipts_user_id" ON "goods_receipts" ("user_id");`,
    );

    // 3. Create Table: goods_receipt_items
    await queryRunner.query(`
      CREATE TABLE "goods_receipt_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "goods_receipt_id" uuid NOT NULL,
        "purchase_order_item_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "purchase_unit_id" uuid NOT NULL,
        "received_qty_purchase_unit" numeric(12, 4) NOT NULL,
        "received_qty_base" numeric(14, 2) NOT NULL,
        "conversion_factor_used" numeric(10, 4) NOT NULL,
        "provisional_cost_unit_net" numeric(12, 4) NOT NULL,
        "provisional_subtotal_net" numeric(24, 4) NOT NULL,
        "stock_movement_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_goods_receipt_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_goods_receipt_items_receipt_po_item" UNIQUE ("goods_receipt_id", "purchase_order_item_id"),
        CONSTRAINT "UQ_goods_receipt_items_stock_movement" UNIQUE ("stock_movement_id"),
        CONSTRAINT "FK_goods_receipt_items_receipt" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_items_po_item" FOREIGN KEY ("purchase_order_item_id") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_items_purchase_unit" FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_items_stock_movement" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_goods_receipt_items_qty_purchase" CHECK ("received_qty_purchase_unit" > 0),
        CONSTRAINT "CHK_goods_receipt_items_qty_base" CHECK ("received_qty_base" > 0),
        CONSTRAINT "CHK_goods_receipt_items_factor" CHECK ("conversion_factor_used" > 0),
        CONSTRAINT "CHK_goods_receipt_items_provisional_cost" CHECK ("provisional_cost_unit_net" >= 0),
        CONSTRAINT "CHK_goods_receipt_items_provisional_subtotal" CHECK ("provisional_subtotal_net" >= 0)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipt_items_receipt_id" ON "goods_receipt_items" ("goods_receipt_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipt_items_po_item_id" ON "goods_receipt_items" ("purchase_order_item_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipt_items_product_id" ON "goods_receipt_items" ("product_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_goods_receipt_items_stock_movement_id" ON "goods_receipt_items" ("stock_movement_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "goods_receipt_items";`);
    await queryRunner.query(`DROP TABLE "goods_receipts";`);
    await queryRunner.query(`DROP SEQUENCE "goods_receipt_number_seq";`);
  }
}

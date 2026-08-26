import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrdersTables1700000000014 implements MigrationInterface {
  name = 'CreatePurchaseOrdersTables1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Sequence for concurrent-safe order numbering (max 6 digits)
    await queryRunner.query(`
      CREATE SEQUENCE "purchase_order_number_seq"
        AS integer
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 999999
        START WITH 1
        NO CYCLE;
    `);

    // 2. Create Table: purchase_orders
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_number" varchar(30) NOT NULL DEFAULT ('OC-' || LPAD(nextval('purchase_order_number_seq')::text, 6, '0')),
        "supplier_id" uuid NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'BORRADOR',
        "expected_delivery_date" date,
        "notes" text,
        "total_net" numeric(24, 4) NOT NULL DEFAULT 0,
        "user_id" uuid NOT NULL,
        "emitted_at" timestamptz,
        "cancelled_at" timestamptz,
        "cancel_reason" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_purchase_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchase_orders_order_number" UNIQUE ("order_number"),
        CONSTRAINT "FK_purchase_orders_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_orders_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_purchase_orders_status" CHECK ("status" IN ('BORRADOR', 'EMITIDA', 'PARCIAL', 'COMPLETADA', 'CANCELADA')),
        CONSTRAINT "CHK_purchase_orders_total_net" CHECK ("total_net" >= 0)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_supplier_id" ON "purchase_orders" ("supplier_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_status" ON "purchase_orders" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_created_at" ON "purchase_orders" ("created_at" DESC);`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_user_id" ON "purchase_orders" ("user_id");`,
    );

    // 3. Create Table: purchase_order_items
    await queryRunner.query(`
      CREATE TABLE "purchase_order_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "purchase_order_id" uuid NOT NULL,
        "item_index" integer NOT NULL,
        "supplier_product_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "purchase_unit_id" uuid NOT NULL,
        "supplier_sku_snapshot" varchar(100) NOT NULL,
        "product_code_snapshot" varchar(50) NOT NULL,
        "product_name_snapshot" varchar(200) NOT NULL,
        "purchase_unit_name_snapshot" varchar(50) NOT NULL,
        "purchase_unit_symbol_snapshot" varchar(20) NOT NULL,
        "conversion_factor_snapshot" numeric(10, 4) NOT NULL,
        "ordered_qty" numeric(12, 4) NOT NULL,
        "received_qty" numeric(12, 4) NOT NULL DEFAULT 0,
        "expected_cost_unit_net" numeric(12, 4) NOT NULL,
        "subtotal_net" numeric(24, 4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT "PK_purchase_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchase_order_items_order_item_index" UNIQUE ("purchase_order_id", "item_index"),
        CONSTRAINT "UQ_purchase_order_items_order_supplier_product" UNIQUE ("purchase_order_id", "supplier_product_id"),
        CONSTRAINT "FK_purchase_order_items_order" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_order_items_supplier_product" FOREIGN KEY ("supplier_product_id") REFERENCES "supplier_products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_order_items_purchase_unit" FOREIGN KEY ("purchase_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_purchase_order_items_conversion_factor" CHECK ("conversion_factor_snapshot" > 0),
        CONSTRAINT "CHK_purchase_order_items_ordered_qty" CHECK ("ordered_qty" > 0),
        CONSTRAINT "CHK_purchase_order_items_received_qty" CHECK ("received_qty" >= 0 AND "received_qty" <= "ordered_qty"),
        CONSTRAINT "CHK_purchase_order_items_expected_cost" CHECK ("expected_cost_unit_net" >= 0),
        CONSTRAINT "CHK_purchase_order_items_subtotal_net" CHECK ("subtotal_net" >= 0)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_product_id" ON "purchase_order_items" ("product_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_purchase_unit_id" ON "purchase_order_items" ("purchase_unit_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_items_supplier_product_id" ON "purchase_order_items" ("supplier_product_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "purchase_order_items";`);
    await queryRunner.query(`DROP TABLE "purchase_orders";`);
    await queryRunner.query(`DROP SEQUENCE "purchase_order_number_seq";`);
  }
}

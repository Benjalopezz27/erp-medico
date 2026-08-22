import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsAndConversionsTables1700000000004 implements MigrationInterface {
  name = 'CreateProductsAndConversionsTables1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create products table
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "internal_code" varchar(50) NOT NULL,
        "name" varchar(150) NOT NULL,
        "description" varchar(500),
        "category_id" uuid NOT NULL,
        "base_unit_id" uuid NOT NULL,
        "min_stock" numeric(12, 2) NOT NULL DEFAULT 0,
        "cost_net" numeric(12, 4) NOT NULL DEFAULT 0,
        "markup_percentage" numeric(8, 4),
        "suggested_price_net" numeric(12, 2) NOT NULL DEFAULT 0,
        "active_price_net" numeric(12, 2) NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_products_base_unit_id" FOREIGN KEY ("base_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_products_internal_code_not_empty" CHECK (LENGTH(TRIM("internal_code")) > 0),
        CONSTRAINT "CHK_products_name_not_empty" CHECK (LENGTH(TRIM("name")) > 0),
        CONSTRAINT "CHK_products_min_stock_non_negative" CHECK ("min_stock" >= 0),
        CONSTRAINT "CHK_products_cost_net_non_negative" CHECK ("cost_net" >= 0),
        CONSTRAINT "CHK_products_markup_percentage_valid" CHECK ("markup_percentage" IS NULL OR ("markup_percentage" >= 0 AND "markup_percentage" <= 1000)),
        CONSTRAINT "CHK_products_suggested_price_net_non_negative" CHECK ("suggested_price_net" >= 0),
        CONSTRAINT "CHK_products_active_price_net_non_negative" CHECK ("active_price_net" >= 0),
        CONSTRAINT "CHK_products_status_valid" CHECK ("status" IN ('ACTIVE', 'INACTIVE'))
      )
    `);

    // 2. Functional unique index and performance indices on products
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_products_internal_code_normalized" ON "products" (UPPER(TRIM("internal_code")));
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_category_id" ON "products" ("category_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_base_unit_id" ON "products" ("base_unit_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_status" ON "products" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_products_name" ON "products" ("name");
    `);

    // 3. Create product_unit_conversions table
    await queryRunner.query(`
      CREATE TABLE "product_unit_conversions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "presentation_unit_id" uuid NOT NULL,
        "conversion_factor" numeric(10, 4) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_unit_conversions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_unit_conversions_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_product_unit_conversions_presentation_unit_id" FOREIGN KEY ("presentation_unit_id") REFERENCES "units"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_product_unit_conversions_factor_positive" CHECK ("conversion_factor" > 0),
        CONSTRAINT "UQ_product_unit_conversions_product_presentation" UNIQUE ("product_id", "presentation_unit_id")
      )
    `);

    // 4. Performance indices on product_unit_conversions
    await queryRunner.query(`
      CREATE INDEX "IDX_product_unit_conversions_product_id" ON "product_unit_conversions" ("product_id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_product_unit_conversions_presentation_unit_id" ON "product_unit_conversions" ("presentation_unit_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop product_unit_conversions without CASCADE
    await queryRunner.query(`DROP TABLE "product_unit_conversions"`);

    // 2. Drop products without CASCADE
    await queryRunner.query(`DROP TABLE "products"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerSpecialPricesAndDiscounts1700000000022 implements MigrationInterface {
  name = 'CreateCustomerSpecialPricesAndDiscounts1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN "general_discount_percentage" numeric(7,4) NOT NULL DEFAULT 0,
      ADD CONSTRAINT "CHK_customers_general_discount" CHECK (
        "general_discount_percentage" BETWEEN 0 AND 100
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "customer_special_prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "special_price_net" numeric(14,2),
        "discount_percentage" numeric(7,4),
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_special_prices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_customer_special_prices_pair" UNIQUE ("customer_id", "product_id"),
        CONSTRAINT "CHK_customer_special_prices_mode" CHECK (
          ("special_price_net" IS NOT NULL AND "special_price_net" >= 0 AND "discount_percentage" IS NULL) OR
          ("special_price_net" IS NULL AND "discount_percentage" BETWEEN 0 AND 100)
        ),
        CONSTRAINT "CHK_customer_special_prices_version" CHECK ("version" > 0),
        CONSTRAINT "FK_customer_special_prices_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_customer_special_prices_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_special_prices_customer" ON "customer_special_prices" ("customer_id", "created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_customer_special_prices_product" ON "customer_special_prices" ("product_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customer_special_prices"`);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP CONSTRAINT "CHK_customers_general_discount",
      DROP COLUMN "general_discount_percentage"
    `);
  }
}

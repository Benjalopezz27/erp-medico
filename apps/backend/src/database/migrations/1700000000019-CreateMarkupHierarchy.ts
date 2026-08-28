import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarkupHierarchy1700000000019 implements MigrationInterface {
  name = 'CreateMarkupHierarchy1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "markup_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "level" varchar(20) NOT NULL,
        "percentage" numeric(8,4) NOT NULL,
        "category_id" uuid NULL,
        "product_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_markup_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_markup_configuration_level" CHECK ("level" IN ('GLOBAL','CATEGORY','PRODUCT')),
        CONSTRAINT "CHK_markup_configuration_percentage" CHECK ("percentage" BETWEEN 0 AND 1000),
        CONSTRAINT "CHK_markup_configuration_target" CHECK (
          ("level" = 'GLOBAL' AND "category_id" IS NULL AND "product_id" IS NULL) OR
          ("level" = 'CATEGORY' AND "category_id" IS NOT NULL AND "product_id" IS NULL) OR
          ("level" = 'PRODUCT' AND "category_id" IS NULL AND "product_id" IS NOT NULL)
        ),
        CONSTRAINT "FK_markup_configuration_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_markup_configuration_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_markup_configuration_global" ON "markup_configurations" ("level") WHERE "level" = 'GLOBAL'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_markup_configuration_category" ON "markup_configurations" ("category_id") WHERE "level" = 'CATEGORY'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_markup_configuration_product" ON "markup_configurations" ("product_id") WHERE "level" = 'PRODUCT'`,
    );
    await queryRunner.query(`
      INSERT INTO "markup_configurations" ("level", "percentage")
      VALUES ('GLOBAL', 0.0000)
    `);
    await queryRunner.query(`
      INSERT INTO "markup_configurations" ("level", "percentage", "product_id")
      SELECT 'PRODUCT', "markup_percentage", "id"
      FROM "products"
      WHERE "markup_percentage" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "price_reviews"
      ADD COLUMN "effective_markup_level" varchar(20) NULL,
      ADD COLUMN "effective_markup_configuration_id" uuid NULL,
      ADD COLUMN "effective_markup_target_id" uuid NULL,
      ADD COLUMN "effective_markup_target_name" varchar(200) NULL,
      ADD CONSTRAINT "CHK_price_review_markup_level" CHECK (
        "effective_markup_level" IS NULL OR "effective_markup_level" IN ('GLOBAL','CATEGORY','PRODUCT')
      )
    `);
    await queryRunner.query(`
      UPDATE "price_reviews"
      SET "effective_markup_level" = 'PRODUCT',
          "effective_markup_target_id" = "product_id",
          "effective_markup_target_name" = "product_name_snapshot"
      WHERE "markup_percentage_snapshot" IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "markup_percentage"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "markup_percentage" numeric(8,4) NULL`,
    );
    await queryRunner.query(`
      UPDATE "products" p
      SET "markup_percentage" = m."percentage"
      FROM "markup_configurations" m
      WHERE m."level" = 'PRODUCT' AND m."product_id" = p."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "price_reviews"
      DROP CONSTRAINT "CHK_price_review_markup_level",
      DROP COLUMN "effective_markup_target_name",
      DROP COLUMN "effective_markup_target_id",
      DROP COLUMN "effective_markup_configuration_id",
      DROP COLUMN "effective_markup_level"
    `);
    await queryRunner.query(`DROP TABLE "markup_configurations"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

type InvalidTaxRow = { id: string; iva_percentage: string };

export class AddProductTaxTreatment1700000000024 implements MigrationInterface {
  name = 'AddProductTaxTreatment1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const allowedRates = '0, 2.5, 5, 10.5, 21, 27';
    const invalidProducts = (await queryRunner.query(`
      SELECT "id", "iva_percentage"
      FROM "products"
      WHERE "iva_percentage" NOT IN (${allowedRates})
    `)) as InvalidTaxRow[];
    const invalidSaleItems = (await queryRunner.query(`
      SELECT "id", "iva_percentage"
      FROM "sale_items"
      WHERE "iva_percentage" NOT IN (${allowedRates})
    `)) as InvalidTaxRow[];

    if (invalidProducts.length > 0 || invalidSaleItems.length > 0) {
      const productIds =
        invalidProducts.map((row) => row.id).join(', ') || 'ninguno';
      const saleItemIds =
        invalidSaleItems.map((row) => row.id).join(', ') || 'ninguno';
      throw new Error(
        `No se puede migrar el tratamiento fiscal: existen alícuotas fuera de la lista ARCA. Productos: ${productIds}. Ítems de venta: ${saleItemIds}.`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "tax_treatment" varchar(20) NOT NULL DEFAULT 'GRAVADO'
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP CONSTRAINT "CHK_products_iva_percentage",
      ALTER COLUMN "iva_percentage" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "CHK_products_tax_configuration" CHECK (
        ("tax_treatment" = 'GRAVADO' AND "iva_percentage" IN (0, 2.5, 5, 10.5, 21, 27)) OR
        ("tax_treatment" IN ('EXENTO', 'NO_GRAVADO') AND "iva_percentage" IS NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD COLUMN "tax_treatment" varchar(20) NOT NULL DEFAULT 'GRAVADO'
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      DROP CONSTRAINT "CHK_sale_items_values",
      ALTER COLUMN "iva_percentage" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ADD CONSTRAINT "CHK_sale_items_values" CHECK (
        "quantity_base" > 0 AND "catalog_price_net" >= 0 AND "discount_amount_net" >= 0 AND
        "unit_price_net" >= 0 AND "subtotal_net" >= 0 AND "iva_amount" >= 0 AND
        "subtotal_gross" >= 0 AND
        ("discount_percentage" IS NULL OR "discount_percentage" BETWEEN 0 AND 100) AND
        (("tax_treatment" = 'GRAVADO' AND "iva_percentage" IN (0, 2.5, 5, 10.5, 21, 27)) OR
         ("tax_treatment" IN ('EXENTO', 'NO_GRAVADO') AND "iva_percentage" IS NULL AND "iva_amount" = 0))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "sales"
      ADD COLUMN "taxable_net" numeric(14,2) NOT NULL DEFAULT 0,
      ADD COLUMN "exempt_amount" numeric(14,2) NOT NULL DEFAULT 0,
      ADD COLUMN "non_taxed_amount" numeric(14,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`UPDATE "sales" SET "taxable_net" = "total_net"`);
    await queryRunner.query(`
      ALTER TABLE "sales"
      ADD CONSTRAINT "CHK_sales_fiscal_totals" CHECK (
        "taxable_net" >= 0 AND "exempt_amount" >= 0 AND "non_taxed_amount" >= 0 AND
        "total_net" = "taxable_net" + "exempt_amount" + "non_taxed_amount" AND
        "total_gross" = "total_net" + "iva_total"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales"
      DROP CONSTRAINT "CHK_sales_fiscal_totals",
      DROP COLUMN "non_taxed_amount",
      DROP COLUMN "exempt_amount",
      DROP COLUMN "taxable_net"
    `);
    await queryRunner.query(
      `ALTER TABLE "sale_items" DROP CONSTRAINT "CHK_sale_items_values"`,
    );
    await queryRunner.query(
      `UPDATE "sale_items" SET "iva_percentage" = 0 WHERE "iva_percentage" IS NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "sale_items"
      ALTER COLUMN "iva_percentage" SET NOT NULL,
      DROP COLUMN "tax_treatment",
      ADD CONSTRAINT "CHK_sale_items_values" CHECK (
        "quantity_base" > 0 AND "catalog_price_net" >= 0 AND "discount_amount_net" >= 0 AND
        "unit_price_net" >= 0 AND "subtotal_net" >= 0 AND "iva_percentage" BETWEEN 0 AND 100 AND
        "iva_amount" >= 0 AND "subtotal_gross" >= 0 AND
        ("discount_percentage" IS NULL OR "discount_percentage" BETWEEN 0 AND 100)
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "CHK_products_tax_configuration"`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "iva_percentage" = 0 WHERE "iva_percentage" IS NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "iva_percentage" SET NOT NULL,
      ALTER COLUMN "iva_percentage" SET DEFAULT 21.00,
      DROP COLUMN "tax_treatment",
      ADD CONSTRAINT "CHK_products_iva_percentage" CHECK ("iva_percentage" BETWEEN 0 AND 100)
    `);
  }
}

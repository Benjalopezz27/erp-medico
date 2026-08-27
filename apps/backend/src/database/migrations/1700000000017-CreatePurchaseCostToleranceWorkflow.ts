import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseCostToleranceWorkflow1700000000017 implements MigrationInterface {
  name = 'CreatePurchaseCostToleranceWorkflow1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "purchase_settings" (
        "id" smallint NOT NULL DEFAULT 1,
        "cost_tolerance_percentage" numeric(7,4) NOT NULL DEFAULT 5.0000,
        "updated_by_user_id" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_settings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_purchase_settings_singleton" CHECK ("id" = 1),
        CONSTRAINT "CHK_purchase_settings_tolerance" CHECK ("cost_tolerance_percentage" >= 0 AND "cost_tolerance_percentage" <= 100),
        CONSTRAINT "FK_purchase_settings_user" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `INSERT INTO "purchase_settings" ("id", "cost_tolerance_percentage") VALUES (1, 5.0000)`,
    );

    await queryRunner.query(`
      ALTER TABLE "supplier_invoices"
      ADD COLUMN "tax_mode" varchar(20) NOT NULL DEFAULT 'AMOUNT',
      ADD COLUMN "tax_percentage" numeric(7,4) NULL,
      ADD COLUMN "cost_tolerance_percentage_snapshot" numeric(7,4) NOT NULL DEFAULT 5.0000,
      ADD COLUMN "decision_action" varchar(20) NULL,
      ADD COLUMN "decision_reason" varchar(500) NULL,
      ADD COLUMN "decision_user_id" uuid NULL,
      ADD COLUMN "decided_at" timestamptz NULL,
      ADD CONSTRAINT "CHK_supplier_invoice_tax_mode" CHECK ("tax_mode" IN ('AMOUNT','PERCENTAGE')),
      ADD CONSTRAINT "CHK_supplier_invoice_tax_percentage" CHECK (("tax_mode" = 'AMOUNT' AND "tax_percentage" IS NULL) OR ("tax_mode" = 'PERCENTAGE' AND "tax_percentage" BETWEEN 0 AND 100)),
      ADD CONSTRAINT "CHK_supplier_invoice_tolerance_snapshot" CHECK ("cost_tolerance_percentage_snapshot" BETWEEN 0 AND 100),
      ADD CONSTRAINT "CHK_supplier_invoice_decision" CHECK (
        ("decision_action" IS NULL AND "decision_reason" IS NULL AND "decision_user_id" IS NULL AND "decided_at" IS NULL) OR
        ("decision_action" = 'AUTHORIZE' AND "decision_reason" IS NULL AND "decision_user_id" IS NOT NULL AND "decided_at" IS NOT NULL) OR
        ("decision_action" = 'REJECT' AND length(trim("decision_reason")) >= 3 AND "decision_user_id" IS NOT NULL AND "decided_at" IS NOT NULL)
      ),
      ADD CONSTRAINT "FK_supplier_invoice_decision_user" FOREIGN KEY ("decision_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "supplier_invoice_items"
      ADD COLUMN "discount_mode" varchar(20) NOT NULL DEFAULT 'AMOUNT',
      ADD COLUMN "discount_percentage" numeric(7,4) NULL,
      ADD COLUMN "bonus_mode" varchar(20) NOT NULL DEFAULT 'AMOUNT',
      ADD COLUMN "bonus_percentage" numeric(7,4) NULL,
      ADD COLUMN "surcharge_mode" varchar(20) NOT NULL DEFAULT 'AMOUNT',
      ADD COLUMN "surcharge_percentage" numeric(7,4) NULL,
      ADD COLUMN "cost_difference_unit_net" numeric(24,4) NOT NULL DEFAULT 0,
      ADD COLUMN "cost_variation_percentage" numeric(30,4) NULL,
      ADD COLUMN "cost_status" varchar(40) NOT NULL DEFAULT 'WITHIN_TOLERANCE',
      ADD COLUMN "quantity_observed" boolean NOT NULL DEFAULT false,
      ADD COLUMN "cost_observed" boolean NOT NULL DEFAULT false,
      ADD CONSTRAINT "CHK_supplier_invoice_item_adjustment_modes" CHECK (
        "discount_mode" IN ('AMOUNT','PERCENTAGE') AND "bonus_mode" IN ('AMOUNT','PERCENTAGE') AND "surcharge_mode" IN ('AMOUNT','PERCENTAGE')
      ),
      ADD CONSTRAINT "CHK_supplier_invoice_item_percentages" CHECK (
        (("discount_mode" = 'AMOUNT' AND "discount_percentage" IS NULL) OR ("discount_mode" = 'PERCENTAGE' AND "discount_percentage" BETWEEN 0 AND 100)) AND
        (("bonus_mode" = 'AMOUNT' AND "bonus_percentage" IS NULL) OR ("bonus_mode" = 'PERCENTAGE' AND "bonus_percentage" BETWEEN 0 AND 100)) AND
        (("surcharge_mode" = 'AMOUNT' AND "surcharge_percentage" IS NULL) OR ("surcharge_mode" = 'PERCENTAGE' AND "surcharge_percentage" BETWEEN 0 AND 100))
      ),
      ADD CONSTRAINT "CHK_supplier_invoice_item_cost_status" CHECK ("cost_status" IN ('WITHIN_TOLERANCE','EXCEEDS_TOLERANCE','ZERO_BASELINE_UNCHANGED','ZERO_BASELINE_INCREASE')),
      ADD CONSTRAINT "CHK_supplier_invoice_item_cost_variation" CHECK ("cost_variation_percentage" IS NULL OR "cost_variation_percentage" >= 0)
    `);

    await queryRunner.query(`
      UPDATE "supplier_invoice_items"
      SET
        "cost_difference_unit_net" = round("real_cost_unit_net" - "provisional_cost_unit_net", 4),
        "cost_variation_percentage" = CASE
          WHEN "provisional_cost_unit_net" = 0 THEN NULL
          ELSE round(abs("real_cost_unit_net" - "provisional_cost_unit_net") / "provisional_cost_unit_net" * 100, 4)
        END,
        "cost_status" = CASE
          WHEN "provisional_cost_unit_net" = 0 AND "real_cost_unit_net" = 0 THEN 'ZERO_BASELINE_UNCHANGED'
          WHEN "provisional_cost_unit_net" = 0 THEN 'ZERO_BASELINE_INCREASE'
          WHEN round(abs("real_cost_unit_net" - "provisional_cost_unit_net") / "provisional_cost_unit_net" * 100, 4) > 5.0000 THEN 'EXCEEDS_TOLERANCE'
          ELSE 'WITHIN_TOLERANCE'
        END,
        "quantity_observed" = "quantity_status" = 'EXCEDIDA',
        "cost_observed" = CASE
          WHEN "provisional_cost_unit_net" = 0 THEN "real_cost_unit_net" > 0
          ELSE round(abs("real_cost_unit_net" - "provisional_cost_unit_net") / "provisional_cost_unit_net" * 100, 4) > 5.0000
        END
    `);
    await queryRunner.query(`
      UPDATE "supplier_invoices" invoice
      SET "status" = CASE WHEN EXISTS (
        SELECT 1 FROM "supplier_invoice_items" item
        WHERE item."supplier_invoice_id" = invoice."id"
          AND (item."quantity_observed" OR item."cost_observed")
      ) THEN 'OBSERVADA' ELSE 'AUTORIZADA' END
      WHERE invoice."status" = 'VALIDANDO'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "CHK_supplier_invoice_item_cost_variation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "CHK_supplier_invoice_item_cost_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "CHK_supplier_invoice_item_percentages"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP CONSTRAINT "CHK_supplier_invoice_item_adjustment_modes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoice_items" DROP COLUMN "cost_observed", DROP COLUMN "quantity_observed", DROP COLUMN "cost_status", DROP COLUMN "cost_variation_percentage", DROP COLUMN "cost_difference_unit_net", DROP COLUMN "surcharge_percentage", DROP COLUMN "surcharge_mode", DROP COLUMN "bonus_percentage", DROP COLUMN "bonus_mode", DROP COLUMN "discount_percentage", DROP COLUMN "discount_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "FK_supplier_invoice_decision_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "CHK_supplier_invoice_decision"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "CHK_supplier_invoice_tolerance_snapshot"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "CHK_supplier_invoice_tax_percentage"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP CONSTRAINT "CHK_supplier_invoice_tax_mode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier_invoices" DROP COLUMN "decided_at", DROP COLUMN "decision_user_id", DROP COLUMN "decision_reason", DROP COLUMN "decision_action", DROP COLUMN "cost_tolerance_percentage_snapshot", DROP COLUMN "tax_percentage", DROP COLUMN "tax_mode"`,
    );
    await queryRunner.query(`DROP TABLE "purchase_settings"`);
  }
}

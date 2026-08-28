import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceReviewDecisions1700000000020 implements MigrationInterface {
  name = 'AddPriceReviewDecisions1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "price_reviews"
      ADD COLUMN "decision_action" varchar(30) NULL,
      ADD COLUMN "decision_reason" varchar(500) NULL
    `);

    await queryRunner.query(`
      UPDATE "price_reviews" review
      SET "decision_action" = CASE
            WHEN review."status" = 'APROBADO' AND (
              review."approved_price_net" IS NULL OR
              review."approved_price_net" <= 0 OR
              review."approved_price_net" IS NOT DISTINCT FROM review."suggested_price_net"
            )
              THEN 'APPROVE_SUGGESTED'
            WHEN review."status" = 'APROBADO' THEN 'APPROVE_CUSTOM'
            WHEN review."status" = 'RECHAZADO' THEN 'REJECT'
            WHEN review."status" = 'POSPUESTO' THEN 'POSTPONE'
            ELSE NULL
          END,
          "approved_price_net" = CASE
            WHEN review."status" = 'APROBADO' AND COALESCE(review."approved_price_net", 0) > 0
              THEN review."approved_price_net"
            WHEN review."status" = 'APROBADO'
              THEN COALESCE(review."approved_price_net", review."suggested_price_net")
            ELSE NULL
          END,
          "decision_reason" = CASE
            WHEN review."status" = 'RECHAZADO' THEN 'Decisión histórica migrada'
            ELSE NULL
          END,
          "reviewed_by_user_id" = CASE
            WHEN review."status" <> 'PENDIENTE'
              THEN COALESCE(
                review."reviewed_by_user_id",
                invoice."confirmed_by_user_id",
                invoice."user_id"
              )
            ELSE NULL
          END,
          "reviewed_at" = CASE
            WHEN review."status" <> 'PENDIENTE'
              THEN COALESCE(review."reviewed_at", review."updated_at")
            ELSE NULL
          END
      FROM "supplier_invoices" invoice
      WHERE invoice."id" = review."supplier_invoice_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "price_reviews"
      ADD CONSTRAINT "CHK_price_review_decision_action" CHECK (
        "decision_action" IS NULL OR "decision_action" IN (
          'APPROVE_SUGGESTED', 'APPROVE_CUSTOM', 'REJECT', 'POSTPONE', 'REOPEN'
        )
      ),
      ADD CONSTRAINT "CHK_price_review_decision_reason" CHECK (
        "decision_reason" IS NULL OR char_length(btrim("decision_reason")) BETWEEN 3 AND 500
      ),
      ADD CONSTRAINT "CHK_price_review_state_decision" CHECK (
        (
          "status" = 'PENDIENTE' AND "approved_price_net" IS NULL AND (
            (
              "decision_action" IS NULL AND "decision_reason" IS NULL AND
              "reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL
            ) OR (
              "decision_action" = 'REOPEN' AND
              "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
            )
          )
        ) OR (
          "status" = 'APROBADO' AND
          "decision_action" IN ('APPROVE_SUGGESTED', 'APPROVE_CUSTOM') AND
          "approved_price_net" IS NOT NULL AND
          ("decision_action" <> 'APPROVE_CUSTOM' OR "approved_price_net" > 0) AND
          "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
        ) OR (
          "status" = 'RECHAZADO' AND "decision_action" = 'REJECT' AND
          "decision_reason" IS NOT NULL AND "approved_price_net" IS NULL AND
          "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
        ) OR (
          "status" = 'POSPUESTO' AND "decision_action" = 'POSTPONE' AND
          "approved_price_net" IS NULL AND
          "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL
        )
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_price_review_product_created" ON "price_reviews" ("product_id", "created_at" DESC, "id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_price_review_product_created"`);
    await queryRunner.query(`
      ALTER TABLE "price_reviews"
      DROP CONSTRAINT "CHK_price_review_state_decision",
      DROP CONSTRAINT "CHK_price_review_decision_reason",
      DROP CONSTRAINT "CHK_price_review_decision_action",
      DROP COLUMN "decision_reason",
      DROP COLUMN "decision_action"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFiscalContingencyMetadata1700000000028 implements MigrationInterface {
  name = 'AddFiscalContingencyMetadata1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      ADD COLUMN "attempt_count" integer NOT NULL DEFAULT 0,
      ADD COLUMN "last_attempt_at" timestamptz,
      ADD COLUMN "next_attempt_at" timestamptz,
      ADD COLUMN "failure_stage" varchar(10),
      ADD COLUMN "arca_error_code" varchar(40),
      ADD CONSTRAINT "CHK_fiscal_documents_failure_stage"
        CHECK ("failure_stage" IS NULL OR "failure_stage" IN ('PRE_CAE','POST_CAE'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      DROP CONSTRAINT "CHK_fiscal_documents_failure_stage",
      DROP COLUMN "attempt_count",
      DROP COLUMN "last_attempt_at",
      DROP COLUMN "next_attempt_at",
      DROP COLUMN "failure_stage",
      DROP COLUMN "arca_error_code"
    `);
  }
}

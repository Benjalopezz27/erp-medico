import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfArtifactToFiscalDocuments1700000000027 implements MigrationInterface {
  name = 'AddPdfArtifactToFiscalDocuments1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      ADD COLUMN "pdf_data" bytea,
      ADD COLUMN "pdf_checksum" varchar(64),
      ADD COLUMN "pdf_size_bytes" integer,
      ADD COLUMN "pdf_template_version" varchar(10),
      ADD COLUMN "pdf_generated_at" timestamptz,
      ADD COLUMN "pdf_status" varchar(20) NOT NULL DEFAULT 'PENDIENTE',
      ADD COLUMN "pdf_error_message" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "fiscal_documents"
      DROP COLUMN "pdf_data",
      DROP COLUMN "pdf_checksum",
      DROP COLUMN "pdf_size_bytes",
      DROP COLUMN "pdf_template_version",
      DROP COLUMN "pdf_generated_at",
      DROP COLUMN "pdf_status",
      DROP COLUMN "pdf_error_message"
    `);
  }
}

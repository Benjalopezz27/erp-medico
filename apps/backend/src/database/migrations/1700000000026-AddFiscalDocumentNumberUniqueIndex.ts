import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFiscalDocumentNumberUniqueIndex1700000000026
  implements MigrationInterface
{
  name = 'AddFiscalDocumentNumberUniqueIndex1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_fiscal_documents_type_pos_number"
      ON "fiscal_documents" ("document_type", "point_of_sale", "document_number")
      WHERE "document_number" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_fiscal_documents_type_pos_number"`,
    );
  }
}

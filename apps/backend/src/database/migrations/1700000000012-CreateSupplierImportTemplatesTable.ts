import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
} from 'typeorm';

export class CreateSupplierImportTemplatesTable1700000000012 implements MigrationInterface {
  name = 'CreateSupplierImportTemplatesTable1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'supplier_import_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'supplier_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'header_fingerprint',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'mapping',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'headers_snapshot',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'supplier_import_templates',
      new TableForeignKey({
        name: 'FK_supplier_import_templates_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_templates',
      new TableCheck({
        name: 'CHK_supplier_import_templates_name_not_empty',
        expression: `length(trim(name)) > 0`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_templates',
      new TableCheck({
        name: 'CHK_supplier_import_templates_fingerprint_len',
        expression: `length(header_fingerprint) = 64`,
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_supplier_import_templates_supplier_name_upper"
      ON "supplier_import_templates" ("supplier_id", UPPER(TRIM("name")));
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_supplier_import_templates_supplier_fingerprint"
      ON "supplier_import_templates" ("supplier_id", "header_fingerprint");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_supplier_import_templates_supplier_created"
      ON "supplier_import_templates" ("supplier_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_supplier_import_templates_supplier_created";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_import_templates_supplier_fingerprint";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_import_templates_supplier_name_upper";`,
    );
    await queryRunner.dropTable('supplier_import_templates', true, true, true);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateStockImportBatches1700000000008 implements MigrationInterface {
  name = 'CreateStockImportBatches1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table stock_import_batches
    await queryRunner.createTable(
      new Table({
        name: 'stock_import_batches',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'content_checksum',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'file_checksum',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'actor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'row_count',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'movement_count',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'total_quantity_base',
            type: 'numeric',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'result',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'COMPLETED'",
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Unique Index on content_checksum
    await queryRunner.createIndex(
      'stock_import_batches',
      new TableIndex({
        name: 'UQ_stock_import_batches_content_checksum',
        columnNames: ['content_checksum'],
        isUnique: true,
      }),
    );

    // 3. Foreign Key to users
    await queryRunner.createForeignKey(
      'stock_import_batches',
      new TableForeignKey({
        name: 'FK_stock_import_batches_actor_id',
        columnNames: ['actor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // 4. Check constraints
    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_content_checksum',
        expression: `"content_checksum" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_file_checksum',
        expression: `"file_checksum" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_row_count',
        expression: `"row_count" > 0`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_movement_count',
        expression: `"movement_count" = "row_count"`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_total_qty',
        expression: `"total_quantity_base" > 0`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_import_batches',
      new TableCheck({
        name: 'CHK_stock_import_batches_result',
        expression: `"result" = 'COMPLETED'`,
      }),
    );

    // 5. Immutability trigger function and trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_stock_import_batch_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Table stock_import_batches is append-only. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_stock_import_batches_immutable
      BEFORE UPDATE OR DELETE ON stock_import_batches
      FOR EACH ROW EXECUTE FUNCTION prevent_stock_import_batch_modification();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_stock_import_batches_immutable ON stock_import_batches;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_stock_import_batch_modification();
    `);

    await queryRunner.dropTable('stock_import_batches', true, true, true);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateSupplierImportBatchesTables1700000000013 implements MigrationInterface {
  name = 'CreateSupplierImportBatchesTables1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table supplier_import_batches
    await queryRunner.createTable(
      new Table({
        name: 'supplier_import_batches',
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
            name: 'actor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'template_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_checksum',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'header_fingerprint',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'mapping_checksum',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'content_checksum',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'mapping_snapshot',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'total_rows',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'applied_rows',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'changed_rows',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'unchanged_rows',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Foreign keys for supplier_import_batches
    await queryRunner.createForeignKey(
      'supplier_import_batches',
      new TableForeignKey({
        name: 'FK_supplier_import_batches_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_import_batches',
      new TableForeignKey({
        name: 'FK_supplier_import_batches_actor',
        columnNames: ['actor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_import_batches',
      new TableForeignKey({
        name: 'FK_supplier_import_batches_template',
        columnNames: ['template_id'],
        referencedTableName: 'supplier_import_templates',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Check constraints for supplier_import_batches
    await queryRunner.createCheckConstraint(
      'supplier_import_batches',
      new TableCheck({
        name: 'CHK_supplier_import_batches_file_hash',
        expression: `"file_checksum" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batches',
      new TableCheck({
        name: 'CHK_supplier_import_batches_header_fp',
        expression: `"header_fingerprint" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batches',
      new TableCheck({
        name: 'CHK_supplier_import_batches_map_hash',
        expression: `"mapping_checksum" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batches',
      new TableCheck({
        name: 'CHK_supplier_import_batches_cnt_hash',
        expression: `"content_checksum" ~ '^[0-9a-f]{64}$'`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batches',
      new TableCheck({
        name: 'CHK_supplier_import_batches_counts',
        expression: `"total_rows" > 0 AND "applied_rows" > 0 AND "changed_rows" >= 0 AND "unchanged_rows" >= 0 AND "applied_rows" = ("changed_rows" + "unchanged_rows") AND "total_rows" = "applied_rows"`,
      }),
    );

    // Unique index: UNIQUE(supplier_id, content_checksum)
    await queryRunner.createUniqueConstraint(
      'supplier_import_batches',
      new TableUnique({
        name: 'UQ_supplier_import_batches_supplier_content_checksum',
        columnNames: ['supplier_id', 'content_checksum'],
      }),
    );

    await queryRunner.createIndex(
      'supplier_import_batches',
      new TableIndex({
        name: 'idx_supplier_import_batches_supplier_created',
        columnNames: ['supplier_id', 'created_at'],
      }),
    );

    // 2. Create table supplier_import_batch_items
    await queryRunner.createTable(
      new Table({
        name: 'supplier_import_batch_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'batch_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'row_number',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'supplier_product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'supplier_sku_snapshot',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'previous_usual_cost_net',
            type: 'numeric',
            precision: 12,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'new_usual_cost_net',
            type: 'numeric',
            precision: 12,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'previous_description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'new_description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'cost_changed',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'description_changed',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Foreign keys for supplier_import_batch_items (ON DELETE RESTRICT)
    await queryRunner.createForeignKey(
      'supplier_import_batch_items',
      new TableForeignKey({
        name: 'FK_supplier_import_batch_items_batch',
        columnNames: ['batch_id'],
        referencedTableName: 'supplier_import_batches',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_import_batch_items',
      new TableForeignKey({
        name: 'FK_supplier_import_batch_items_sp',
        columnNames: ['supplier_product_id'],
        referencedTableName: 'supplier_products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_import_batch_items',
      new TableForeignKey({
        name: 'FK_supplier_import_batch_items_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Check constraints for supplier_import_batch_items
    await queryRunner.createCheckConstraint(
      'supplier_import_batch_items',
      new TableCheck({
        name: 'CHK_supplier_import_batch_items_row_num',
        expression: `"row_number" >= 2`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batch_items',
      new TableCheck({
        name: 'CHK_supplier_import_batch_items_costs',
        expression: `"new_usual_cost_net" > 0 AND ("previous_usual_cost_net" IS NULL OR "previous_usual_cost_net" >= 0)`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batch_items',
      new TableCheck({
        name: 'CHK_supplier_import_batch_items_cost_diff',
        expression: `"cost_changed" = ("previous_usual_cost_net" IS DISTINCT FROM "new_usual_cost_net")`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'supplier_import_batch_items',
      new TableCheck({
        name: 'CHK_supplier_import_batch_items_desc_diff',
        expression: `"description_changed" = ("previous_description" IS DISTINCT FROM "new_description")`,
      }),
    );

    // Unique index: UNIQUE(batch_id, row_number)
    await queryRunner.createUniqueConstraint(
      'supplier_import_batch_items',
      new TableUnique({
        name: 'UQ_supplier_import_batch_items_batch_row',
        columnNames: ['batch_id', 'row_number'],
      }),
    );

    await queryRunner.createIndex(
      'supplier_import_batch_items',
      new TableIndex({
        name: 'idx_supplier_import_batch_items_batch',
        columnNames: ['batch_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(
      'supplier_import_batch_items',
      true,
      true,
      true,
    );
    await queryRunner.dropTable('supplier_import_batches', true, true, true);
  }
}

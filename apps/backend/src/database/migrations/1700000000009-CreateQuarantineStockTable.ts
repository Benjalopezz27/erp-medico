import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

export class CreateQuarantineStockTable1700000000009 implements MigrationInterface {
  name = 'CreateQuarantineStockTable1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create table quarantine_stocks
    await queryRunner.createTable(
      new Table({
        name: 'quarantine_stocks',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'quantity_base',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'EN_CUARENTENA'",
          },
          {
            name: 'entry_actor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'entry_movement_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'resolved_by_actor_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'resolution_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'resolution_movement_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
          {
            name: 'resolved_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Add CHECK Constraints
    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_quantity_positive',
        expression: 'quantity_base > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_reason_not_empty',
        expression: 'LENGTH(TRIM(reason)) > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_resolution_notes_not_empty',
        expression:
          'resolution_notes IS NULL OR LENGTH(TRIM(resolution_notes)) > 0',
      }),
    );

    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_status',
        expression:
          "status IN ('EN_CUARENTENA', 'MERMA_CONFIRMADA', 'DEVOLUCION_PROVEEDOR', 'REINGRESADO_STOCK')",
      }),
    );

    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_resolution_coherence',
        expression: `
          (status = 'EN_CUARENTENA' AND resolved_by_actor_id IS NULL AND resolved_at IS NULL AND resolution_notes IS NULL AND resolution_movement_id IS NULL)
          OR
          (status != 'EN_CUARENTENA' AND resolved_by_actor_id IS NOT NULL AND resolved_at IS NOT NULL AND resolution_notes IS NOT NULL)
        `,
      }),
    );

    await queryRunner.createCheckConstraint(
      'quarantine_stocks',
      new TableCheck({
        name: 'chk_quarantine_reentry_movement_coherence',
        expression: `
          (status = 'REINGRESADO_STOCK' AND resolution_movement_id IS NOT NULL)
          OR
          (status != 'REINGRESADO_STOCK' AND resolution_movement_id IS NULL)
        `,
      }),
    );

    // 3. Add Foreign Key Constraints (RESTRICT)
    await queryRunner.createForeignKey(
      'quarantine_stocks',
      new TableForeignKey({
        name: 'fk_quarantine_stocks_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'quarantine_stocks',
      new TableForeignKey({
        name: 'fk_quarantine_stocks_entry_actor',
        columnNames: ['entry_actor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'quarantine_stocks',
      new TableForeignKey({
        name: 'fk_quarantine_stocks_resolved_actor',
        columnNames: ['resolved_by_actor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'quarantine_stocks',
      new TableForeignKey({
        name: 'fk_quarantine_stocks_entry_movement',
        columnNames: ['entry_movement_id'],
        referencedTableName: 'stock_movements',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'quarantine_stocks',
      new TableForeignKey({
        name: 'fk_quarantine_stocks_resolution_movement',
        columnNames: ['resolution_movement_id'],
        referencedTableName: 'stock_movements',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // 4. Add Unique Constraints & Indexes
    await queryRunner.createUniqueConstraint(
      'quarantine_stocks',
      new TableUnique({
        name: 'uq_quarantine_stocks_entry_movement',
        columnNames: ['entry_movement_id'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_quarantine_stocks_resolution_movement
      ON quarantine_stocks(resolution_movement_id)
      WHERE resolution_movement_id IS NOT NULL;
    `);

    await queryRunner.createIndex(
      'quarantine_stocks',
      new TableIndex({
        name: 'idx_quarantine_stocks_product_id',
        columnNames: ['product_id'],
      }),
    );

    await queryRunner.createIndex(
      'quarantine_stocks',
      new TableIndex({
        name: 'idx_quarantine_stocks_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'quarantine_stocks',
      new TableIndex({
        name: 'idx_quarantine_stocks_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'quarantine_stocks',
      new TableIndex({
        name: 'idx_quarantine_stocks_product_status',
        columnNames: ['product_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quarantine_stocks', true, false, false);
  }
}

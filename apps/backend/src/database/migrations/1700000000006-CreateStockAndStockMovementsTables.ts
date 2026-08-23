import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateStockAndStockMovementsTables1700000000006 implements MigrationInterface {
  name = 'CreateStockAndStockMovementsTables1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Table: stocks
    await queryRunner.createTable(
      new Table({
        name: 'stocks',
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
            isUnique: true,
          },
          {
            name: 'current_base_stock',
            type: 'numeric',
            precision: 14,
            scale: 2,
            isNullable: false,
            default: '0.00',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'now()',
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

    await queryRunner.createForeignKey(
      'stocks',
      new TableForeignKey({
        name: 'FK_stocks_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'stocks',
      new TableIndex({
        name: 'IDX_stocks_product_id',
        columnNames: ['product_id'],
      }),
    );

    // 2. Table: stock_movements
    await queryRunner.createTable(
      new Table({
        name: 'stock_movements',
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
            name: 'movement_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'quantity_base',
            type: 'numeric',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'previous_stock',
            type: 'numeric',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'subsequent_stock',
            type: 'numeric',
            precision: 14,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'document_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
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

    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        name: 'FK_stock_movements_product_id',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'stock_movements',
      new TableForeignKey({
        name: 'FK_stock_movements_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_movements',
      new TableCheck({
        name: 'CHK_stock_movements_quantity_positive',
        expression: `"quantity_base" > 0`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_movements',
      new TableCheck({
        name: 'CHK_stock_movements_reason_non_empty',
        expression: `TRIM("reason") <> ''`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'stock_movements',
      new TableCheck({
        name: 'CHK_stock_movements_movement_type',
        expression: `"movement_type" IN (
          'ENTRADA_COMPRA',
          'SALIDA_VENTA',
          'MERMA',
          'AJUSTE_ENTRADA',
          'AJUSTE_SALIDA',
          'DEVOLUCION_CLIENTE'
        )`,
      }),
    );

    await queryRunner.createIndex(
      'stock_movements',
      new TableIndex({
        name: 'IDX_stock_movements_product_created',
        columnNames: ['product_id', 'created_at', 'id'],
      }),
    );

    await queryRunner.createIndex(
      'stock_movements',
      new TableIndex({
        name: 'IDX_stock_movements_movement_type',
        columnNames: ['movement_type'],
      }),
    );

    await queryRunner.createIndex(
      'stock_movements',
      new TableIndex({
        name: 'IDX_stock_movements_user_id',
        columnNames: ['user_id'],
      }),
    );

    // 3. Database-level Immutability Trigger (PostgreSQL)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_stock_movement_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Stock movements are immutable. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_stock_movement_modification
      BEFORE UPDATE OR DELETE ON "stock_movements"
      FOR EACH ROW
      EXECUTE FUNCTION prevent_stock_movement_modification();
    `);

    // 4. Idempotent Backfill for Pre-existing Products
    await queryRunner.query(`
      INSERT INTO "stocks" ("id", "product_id", "current_base_stock", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        p."id",
        0.00,
        now(),
        now()
      FROM "products" p
      ON CONFLICT ("product_id") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_prevent_stock_movement_modification ON "stock_movements";`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_stock_movement_modification();`,
    );
    await queryRunner.dropTable('stock_movements', true, true, true);
    await queryRunner.dropTable('stocks', true, true, true);
  }
}

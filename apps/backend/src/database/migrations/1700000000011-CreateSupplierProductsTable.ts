import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateSupplierProductsTable1700000000011 implements MigrationInterface {
  name = 'CreateSupplierProductsTable1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update audit_logs check constraint to allow DELETE
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "CHK_audit_logs_action";`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "CHK_audit_logs_action" CHECK ("action" IN ('CREATE', 'UPDATE', 'ROLE_CHANGE', 'ACTIVATE', 'DEACTIVATE', 'DELETE'));`,
    );

    // 2. Create supplier_products table
    await queryRunner.createTable(
      new Table({
        name: 'supplier_products',
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
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'supplier_external_code',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'supplier_description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'purchase_unit_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'conversion_factor_to_base',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'usual_cost_net',
            type: 'numeric',
            precision: 12,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'is_primary_supplier',
            type: 'boolean',
            default: false,
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

    // 3. Foreign Keys with ON DELETE RESTRICT
    await queryRunner.createForeignKey(
      'supplier_products',
      new TableForeignKey({
        name: 'FK_supplier_products_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'supplier_products',
      new TableForeignKey({
        name: 'FK_supplier_products_product',
        columnNames: ['product_id'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createForeignKey(
      'supplier_products',
      new TableForeignKey({
        name: 'FK_supplier_products_purchase_unit',
        columnNames: ['purchase_unit_id'],
        referencedTableName: 'units',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // 4. Check Constraints
    await queryRunner.createCheckConstraint(
      'supplier_products',
      new TableCheck({
        name: 'CHK_supplier_products_code_not_empty',
        expression: `length(trim(supplier_external_code)) > 0`,
      }),
    );
    await queryRunner.createCheckConstraint(
      'supplier_products',
      new TableCheck({
        name: 'CHK_supplier_products_factor_pos',
        expression: `conversion_factor_to_base > 0`,
      }),
    );
    await queryRunner.createCheckConstraint(
      'supplier_products',
      new TableCheck({
        name: 'CHK_supplier_products_cost_non_neg',
        expression: `usual_cost_net IS NULL OR usual_cost_net >= 0`,
      }),
    );

    // 5. Unique Constraints & Functional / Partial Indexes
    await queryRunner.createUniqueConstraint(
      'supplier_products',
      new TableUnique({
        name: 'uq_supplier_products_supplier_product',
        columnNames: ['supplier_id', 'product_id'],
      }),
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_supplier_products_supplier_sku_upper"
      ON "supplier_products" ("supplier_id", UPPER(TRIM("supplier_external_code")));
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_supplier_products_primary_per_product"
      ON "supplier_products" ("product_id")
      WHERE "is_primary_supplier" = true;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_supplier_products_supplier_created"
      ON "supplier_products" ("supplier_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_supplier_products_supplier_created";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_products_primary_per_product";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_supplier_products_supplier_sku_upper";`,
    );
    await queryRunner.dropTable('supplier_products', true, true, true);

    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "CHK_audit_logs_action";`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "CHK_audit_logs_action" CHECK ("action" IN ('CREATE', 'UPDATE', 'ROLE_CHANGE', 'ACTIVATE', 'DEACTIVATE'));`,
    );
  }
}

import { MigrationInterface, QueryRunner, Table, TableCheck } from 'typeorm';

export class CreateCategoriesAndUnitsTables1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
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

    // Check constraint for non-empty category name
    await queryRunner.createCheckConstraint(
      'categories',
      new TableCheck({
        name: 'CHK_categories_name_not_empty',
        expression: `LENGTH(TRIM("name")) > 0`,
      }),
    );

    // Unique functional index on normalized category name (LOWER(TRIM(name)))
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_categories_name_normalized" ON "categories" (LOWER(TRIM("name")));`,
    );

    // 2. Create units table
    await queryRunner.createTable(
      new Table({
        name: 'units',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'symbol',
            type: 'varchar',
            length: '20',
            isNullable: false,
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

    // Check constraints for non-empty unit name and symbol
    await queryRunner.createCheckConstraint(
      'units',
      new TableCheck({
        name: 'CHK_units_name_not_empty',
        expression: `LENGTH(TRIM("name")) > 0`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'units',
      new TableCheck({
        name: 'CHK_units_symbol_not_empty',
        expression: `LENGTH(TRIM("symbol")) > 0`,
      }),
    );

    // Unique functional indices on normalized unit name and symbol
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_units_name_normalized" ON "units" (LOWER(TRIM("name")));`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_units_symbol_normalized" ON "units" (LOWER(TRIM("symbol")));`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables cleanly without cascade
    await queryRunner.dropTable('units', true);
    await queryRunner.dropTable('categories', true);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableUnique,
} from 'typeorm';

export class CreateSuppliersTable1700000000010 implements MigrationInterface {
  name = 'CreateSuppliersTable1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'business_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'cuit',
            type: 'varchar',
            length: '11',
            isNullable: false,
          },
          {
            name: 'tax_condition',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'whatsapp',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
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

    // Unique constraint on canonical CUIT
    await queryRunner.createUniqueConstraint(
      'suppliers',
      new TableUnique({
        name: 'uq_suppliers_cuit',
        columnNames: ['cuit'],
      }),
    );

    // Check constraint: CUIT must be exactly 11 digits
    await queryRunner.createCheckConstraint(
      'suppliers',
      new TableCheck({
        name: 'chk_suppliers_cuit_format',
        expression: "cuit ~ '^[0-9]{11}$'",
      }),
    );

    // Check constraint: Business name must not be empty after trimming
    await queryRunner.createCheckConstraint(
      'suppliers',
      new TableCheck({
        name: 'chk_suppliers_business_name_not_empty',
        expression: 'LENGTH(TRIM(business_name)) > 0',
      }),
    );

    // Check constraint: Tax condition valid enum values
    await queryRunner.createCheckConstraint(
      'suppliers',
      new TableCheck({
        name: 'chk_suppliers_tax_condition',
        expression:
          "tax_condition IN ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL')",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('suppliers', true);
  }
}

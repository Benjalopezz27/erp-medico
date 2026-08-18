import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableUnique,
} from 'typeorm';

export class CreateUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
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
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'VENDEDOR'",
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

    await queryRunner.createUniqueConstraint(
      'users',
      new TableUnique({
        name: 'UQ_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createCheckConstraint(
      'users',
      new TableCheck({
        name: 'CHK_users_email_normalized',
        expression: `"email" = LOWER(TRIM("email"))`,
      }),
    );

    await queryRunner.createCheckConstraint(
      'users',
      new TableCheck({
        name: 'CHK_users_role',
        expression: `"role" IN ('ADMINISTRADOR', 'VENDEDOR')`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users', true, true, true);
  }
}

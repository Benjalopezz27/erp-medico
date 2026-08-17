import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitMigrationsCheck1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '_migrations_check',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'initialized'",
          },
          {
            name: 'initialized_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('_migrations_check', true);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAuditLogsTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'actor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'entity_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'previous_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_values',
            type: 'jsonb',
            isNullable: true,
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

    // Foreign Key to users(id) ON DELETE RESTRICT
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        name: 'FK_audit_logs_actor',
        columnNames: ['actor_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Check Constraint for Action
    await queryRunner.createCheckConstraint(
      'audit_logs',
      new TableCheck({
        name: 'CHK_audit_logs_action',
        expression: `"action" IN ('CREATE', 'UPDATE', 'ROLE_CHANGE', 'ACTIVATE', 'DEACTIVATE')",
      }),
    );

    // Composite Index for querying entity history
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_entity_query',
        columnNames: ['entity_name', 'entity_id', 'created_at'],
      }),
    );

    // Index on actor_id
    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_actor',
        columnNames: ['actor_id'],
      }),
    );

    // Database-level Immutability Trigger (PostgreSQL)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TIGGER trg_prevent_audit_log_modification
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION prevent_audit_log_modification();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_audit_log_modification();`,
    );
    await queryRunner.dropTable('audit_logs', true, true, true);
  }
}

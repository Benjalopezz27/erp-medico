import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemSettings1700000000033 implements MigrationInterface {
  name = 'CreateSystemSettings1700000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" varchar(50) PRIMARY KEY,
        "value" text NOT NULL,
        "updated_by_user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
  }
}

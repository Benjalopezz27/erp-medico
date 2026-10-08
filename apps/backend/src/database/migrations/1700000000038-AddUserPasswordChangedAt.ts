import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswordChangedAt1700000000038 implements MigrationInterface {
  name = 'AddUserPasswordChangedAt1700000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "password_changed_at"`,
    );
  }
}

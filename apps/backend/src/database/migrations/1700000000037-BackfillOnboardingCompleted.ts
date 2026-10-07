import { MigrationInterface, QueryRunner } from 'typeorm';

/** Instalaciones ya en uso no pasan por el wizard: sin esto el guard 428 las bloquearía. */
export class BackfillOnboardingCompleted1700000000037 implements MigrationInterface {
  name = 'BackfillOnboardingCompleted1700000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value")
      SELECT 'onboarding_completed', 'true'
      WHERE EXISTS (SELECT 1 FROM "users")
        AND (EXISTS (SELECT 1 FROM "products") OR EXISTS (SELECT 1 FROM "sales"))
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "system_settings" WHERE "key" = 'onboarding_completed'`,
    );
  }
}

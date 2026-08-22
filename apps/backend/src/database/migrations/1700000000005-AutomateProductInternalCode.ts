import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomateProductInternalCode1700000000005 implements MigrationInterface {
  name = 'AutomateProductInternalCode1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE "product_internal_code_seq"
        AS integer
        INCREMENT BY 1
        MINVALUE 1
        MAXVALUE 9999
        START WITH 1
        NO CYCLE
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        highest_existing_code integer;
      BEGIN
        SELECT COALESCE(MAX(SUBSTRING("internal_code" FROM '^P([0-9]{4})$')::integer), 0)
          INTO highest_existing_code
          FROM "products"
         WHERE "internal_code" ~ '^P[0-9]{4}$';

        IF highest_existing_code >= 9999 THEN
          RAISE EXCEPTION 'Cannot enable automatic product codes: P9999 is already in use.';
        END IF;

        PERFORM setval(
          'product_internal_code_seq',
          highest_existing_code + 1,
          false
        );
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "internal_code"
      SET DEFAULT ('P' || LPAD(nextval('product_internal_code_seq')::text, 4, '0'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ALTER COLUMN "internal_code" DROP DEFAULT
    `);
    await queryRunner.query(`DROP SEQUENCE "product_internal_code_seq"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStockImportBatchesToProductImportBatches1700000000032 implements MigrationInterface {
  name = 'RenameStockImportBatchesToProductImportBatches1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop trigger and function on old table
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_stock_import_batches_immutable ON stock_import_batches;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_stock_import_batch_modification();
    `);

    // 2. Drop constraints and index with old table name
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_movement_count";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_total_qty";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_row_count";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_content_checksum";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_file_checksum";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "CHK_stock_import_batches_result";
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches DROP CONSTRAINT IF EXISTS "FK_stock_import_batches_actor_id";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_stock_import_batches_content_checksum";
    `);

    // 3. Rename table
    await queryRunner.query(`
      ALTER TABLE stock_import_batches RENAME TO product_import_batches;
    `);

    // 4. Create new index and foreign key on product_import_batches
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_product_import_batches_content_checksum"
      ON product_import_batches ("content_checksum");
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "FK_product_import_batches_actor_id"
      FOREIGN KEY ("actor_id") REFERENCES users("id") ON DELETE RESTRICT;
    `);

    // 5. Add check constraints (adapted for product bulk load: initial stock optional >= 0)
    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_content_checksum"
      CHECK ("content_checksum" ~ '^[0-9a-f]{64}$');
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_file_checksum"
      CHECK ("file_checksum" ~ '^[0-9a-f]{64}$');
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_row_count"
      CHECK ("row_count" > 0);
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_movement_count"
      CHECK ("movement_count" >= 0 AND "movement_count" <= "row_count");
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_total_qty"
      CHECK ("total_quantity_base" >= 0);
    `);

    await queryRunner.query(`
      ALTER TABLE product_import_batches
      ADD CONSTRAINT "CHK_product_import_batches_result"
      CHECK ("result" = 'COMPLETED');
    `);

    // 6. Immutability trigger function and trigger for product_import_batches
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_product_import_batch_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Table product_import_batches is append-only. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_product_import_batches_immutable
      BEFORE UPDATE OR DELETE ON product_import_batches
      FOR EACH ROW EXECUTE FUNCTION prevent_product_import_batch_modification();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_product_import_batches_immutable ON product_import_batches;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS prevent_product_import_batch_modification();
    `);

    // 2. Drop constraints
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_result";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_total_qty";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_movement_count";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_row_count";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_file_checksum";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "CHK_product_import_batches_content_checksum";
    `);
    await queryRunner.query(`
      ALTER TABLE product_import_batches DROP CONSTRAINT IF EXISTS "FK_product_import_batches_actor_id";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_product_import_batches_content_checksum";
    `);

    // 3. Rename table back
    await queryRunner.query(`
      ALTER TABLE product_import_batches RENAME TO stock_import_batches;
    `);

    // 4. Re-create old index and foreign key
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_import_batches_content_checksum"
      ON stock_import_batches ("content_checksum");
    `);

    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "FK_stock_import_batches_actor_id"
      FOREIGN KEY ("actor_id") REFERENCES users("id") ON DELETE RESTRICT;
    `);

    // 5. Re-create old check constraints
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_content_checksum"
      CHECK ("content_checksum" ~ '^[0-9a-f]{64}$');
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_file_checksum"
      CHECK ("file_checksum" ~ '^[0-9a-f]{64}$');
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_row_count"
      CHECK ("row_count" > 0);
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_movement_count"
      CHECK ("movement_count" = "row_count");
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_total_qty"
      CHECK ("total_quantity_base" > 0);
    `);
    await queryRunner.query(`
      ALTER TABLE stock_import_batches
      ADD CONSTRAINT "CHK_stock_import_batches_result"
      CHECK ("result" = 'COMPLETED');
    `);

    // 6. Re-create trigger and function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_stock_import_batch_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Table stock_import_batches is append-only. UPDATE and DELETE operations are prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_stock_import_batches_immutable
      BEFORE UPDATE OR DELETE ON stock_import_batches
      FOR EACH ROW EXECUTE FUNCTION prevent_stock_import_batch_modification();
    `);
  }
}

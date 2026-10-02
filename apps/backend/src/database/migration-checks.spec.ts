import { CreateChecks1700000000031 } from './migrations/1700000000031-CreateChecks';

describe('CreateChecks1700000000031', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateChecks1700000000031();

  beforeEach(() => jest.clearAllMocks());

  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  it('adds payment status and creates checks idempotently', async () => {
    await migration.up(queryRunner);
    const sql = sqlOf();
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "status"');
    expect(sql).toContain("DEFAULT 'REGISTRADO'");
    expect(sql).toContain('CHK_payments_status');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "checks"');
    expect(sql).toContain('UQ_checks_bank_number');
    expect(sql).toContain('UQ_checks_payment');
    expect(sql).toContain('CHK_checks_amount_positive');
    expect(sql).toContain('IDX_checks_status');
    expect(sql).toContain('IDX_checks_due_date');
  });

  it('drops checks before the payment status column', async () => {
    await migration.down(queryRunner);
    const sql = sqlOf();
    expect(sql.indexOf('DROP TABLE "checks"')).toBeLessThan(
      sql.indexOf('DROP COLUMN "status"'),
    );
  });
});

import { RenameStockImportBatchesToProductImportBatches1700000000032 } from './migrations/1700000000032-RenameStockImportBatchesToProductImportBatches';

describe('RenameStockImportBatchesToProductImportBatches1700000000032', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration =
    new RenameStockImportBatchesToProductImportBatches1700000000032();

  beforeEach(() => jest.clearAllMocks());

  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  it('renames table to product_import_batches and reconfigures constraints', async () => {
    await migration.up(queryRunner);
    const sql = sqlOf();
    expect(sql).toContain(
      'ALTER TABLE stock_import_batches RENAME TO product_import_batches',
    );
    expect(sql).toContain('UQ_product_import_batches_content_checksum');
    expect(sql).toContain('FK_product_import_batches_actor_id');
    expect(sql).toContain('CHK_product_import_batches_movement_count');
    expect(sql).toContain('trg_product_import_batches_immutable');
  });

  it('reverts renaming back to stock_import_batches in down()', async () => {
    await migration.down(queryRunner);
    const sql = sqlOf();
    expect(sql).toContain(
      'ALTER TABLE product_import_batches RENAME TO stock_import_batches',
    );
    expect(sql).toContain('UQ_stock_import_batches_content_checksum');
    expect(sql).toContain('trg_stock_import_batches_immutable');
  });
});

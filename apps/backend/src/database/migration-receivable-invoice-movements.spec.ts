import { BackfillReceivableInvoiceMovements1700000000029 } from './migrations/1700000000029-BackfillReceivableInvoiceMovements';

describe('BackfillReceivableInvoiceMovements1700000000029', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new BackfillReceivableInvoiceMovements1700000000029();

  beforeEach(() => jest.clearAllMocks());

  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  it('creates the unique index before the idempotent backfill', async () => {
    await migration.up(queryRunner);
    const sql = sqlOf();
    expect(sql.indexOf('UQ_arm_factura_per_ar')).toBeLessThan(
      sql.indexOf('INSERT INTO "account_receivable_movements"'),
    );
    expect(sql).toContain('WHERE "movement_type" = \'FACTURA\'');
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('ar."original_amount" > 0');
    expect(sql).toContain('s."user_id"');
  });

  it('removes FACTURA rows before dropping the index', async () => {
    await migration.down(queryRunner);
    const sql = sqlOf();
    expect(
      sql.indexOf('DELETE FROM "account_receivable_movements"'),
    ).toBeLessThan(sql.indexOf('DROP INDEX "UQ_arm_factura_per_ar"'));
  });
});

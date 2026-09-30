import { CreatePaymentsAndReceipts1700000000030 } from './migrations/1700000000030-CreatePaymentsAndReceipts';

describe('CreatePaymentsAndReceipts1700000000030', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreatePaymentsAndReceipts1700000000030();

  beforeEach(() => jest.clearAllMocks());

  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  it('creates tables in referential order and seeds the counter idempotently', async () => {
    await migration.up(queryRunner);
    const sql = sqlOf();
    expect(sql.indexOf('CREATE TABLE IF NOT EXISTS "payments"')).toBeLessThan(
      sql.indexOf('CREATE TABLE IF NOT EXISTS "payment_allocations"'),
    );
    expect(sql.indexOf('CREATE TABLE IF NOT EXISTS "payments"')).toBeLessThan(
      sql.indexOf('CREATE TABLE IF NOT EXISTS "receipts"'),
    );
    expect(sql).toContain('CHK_payment_allocations_amount_positive');
    expect(sql).toContain('UQ_payment_allocations_payment_ar');
    expect(sql).toContain('UQ_receipts_number');
    expect(sql).toContain('VALUES (1, 0) ON CONFLICT DO NOTHING');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "payment_id"');
  });

  it('drops the movement column before the payments table', async () => {
    await migration.down(queryRunner);
    const sql = sqlOf();
    expect(sql.indexOf('DROP COLUMN "payment_id"')).toBeLessThan(
      sql.indexOf('DROP TABLE "payments"'),
    );
    expect(sql.indexOf('DROP TABLE "receipts"')).toBeLessThan(
      sql.indexOf('DROP TABLE "payments"'),
    );
  });
});

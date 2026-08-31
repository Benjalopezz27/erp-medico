import { CreateCustomerReturnsAndAdaptQuarantine1700000000025 } from './migrations/1700000000025-CreateCustomerReturnsAndAdaptQuarantine';

describe('CreateCustomerReturnsAndAdaptQuarantine1700000000025', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateCustomerReturnsAndAdaptQuarantine1700000000025();

  beforeEach(() => jest.clearAllMocks());

  it('creates returns, adapts quarantine/fiscal, and creates account receivable movements in referential order', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');

    expect(sql.indexOf('CREATE TABLE "sale_returns"')).toBeLessThan(
      sql.indexOf('CREATE TABLE "sale_return_items"'),
    );
    expect(sql.indexOf('CREATE TABLE "sale_return_items"')).toBeLessThan(
      sql.indexOf('ALTER TABLE "quarantine_stocks"'),
    );
    expect(sql.indexOf('ALTER TABLE "quarantine_stocks"')).toBeLessThan(
      sql.indexOf('CREATE TABLE "account_receivable_movements"'),
    );

    expect(sql).toContain('CHK_sale_returns_totals_non_negative');
    expect(sql).toContain('CHK_sale_returns_total_net_sum');
    expect(sql).toContain('CHK_sale_returns_total_gross_sum');
    expect(sql).toContain('UQ_sale_returns_idempotency');
    expect(sql).toContain('CHK_sale_return_items_qty_positive');
    expect(sql).toContain('CHK_sale_return_items_quality');
    expect(sql).toContain('UQ_sale_return_items_product');
    expect(sql).toContain('CHK_quarantine_stocks_origin_consistency');
    expect(sql).toContain('UQ_fiscal_documents_original_sale');
    expect(sql).toContain('CHK_arm_balances_non_negative');
    expect(sql).toContain('UQ_arm_sale_return');
  });

  it('reverts all created tables and structural adaptations in inverse order', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');

    expect(
      sql.indexOf('DROP TABLE IF EXISTS "account_receivable_movements"'),
    ).toBeLessThan(sql.indexOf('DROP TABLE IF EXISTS "sale_returns"'));
    expect(sql).toContain('DROP TABLE IF EXISTS "sale_return_items"');
    expect(sql).toContain('DROP TABLE IF EXISTS "sale_returns"');
    expect(sql).toContain('UQ_fiscal_documents_sale');
  });
});

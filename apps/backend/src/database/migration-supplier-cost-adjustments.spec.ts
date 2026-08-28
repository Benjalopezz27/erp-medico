import { CreateSupplierCostAdjustmentsAndPriceReviews1700000000018 } from './migrations/1700000000018-CreateSupplierCostAdjustmentsAndPriceReviews';

describe('CreateSupplierCostAdjustmentsAndPriceReviews1700000000018', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration =
    new CreateSupplierCostAdjustmentsAndPriceReviews1700000000018();

  beforeEach(() => jest.clearAllMocks());

  it('creates confirmation metadata, immutable adjustments and price reviews', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('confirmed_by_user_id');
    expect(sql).toContain('CREATE TABLE "supplier_cost_adjustments"');
    expect(sql).toContain('CHK_supplier_cost_adjustment_quantities');
    expect(sql).toContain('trg_prevent_supplier_cost_adjustment_modification');
    expect(sql).toContain('CREATE TABLE "price_reviews"');
    expect(sql).toContain('UQ_price_review_invoice_product');
  });

  it('drops dependants before confirmation metadata', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls.map(([statement]) => statement);
    expect(sql[0]).toBe('DROP TABLE "price_reviews"');
    expect(sql).toContain('DROP TABLE "supplier_cost_adjustments"');
    expect(sql.at(-1)).toContain('DROP COLUMN "confirmed_at"');
  });
});

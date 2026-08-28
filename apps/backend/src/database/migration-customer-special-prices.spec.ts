import { CreateCustomerSpecialPricesAndDiscounts1700000000022 } from './migrations/1700000000022-CreateCustomerSpecialPricesAndDiscounts';

describe('CreateCustomerSpecialPricesAndDiscounts1700000000022', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateCustomerSpecialPricesAndDiscounts1700000000022();

  beforeEach(() => jest.clearAllMocks());

  it('creates the general discount and exclusive customer/product rules', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('general_discount_percentage');
    expect(sql).toContain('CHK_customers_general_discount');
    expect(sql).toContain('CREATE TABLE "customer_special_prices"');
    expect(sql).toContain('UQ_customer_special_prices_pair');
    expect(sql).toContain('CHK_customer_special_prices_mode');
    expect(sql).toContain('CHK_customer_special_prices_version');
    expect(sql).toContain('special_price_net" IS NOT NULL');
    expect(sql).toContain('discount_percentage" BETWEEN 0 AND 100');
    expect(sql).toContain('IDX_customer_special_prices_customer');
  });

  it('removes the rule table before reverting the customer extension', async () => {
    await migration.down(queryRunner);
    expect(queryRunner.query.mock.calls[0][0]).toContain(
      'DROP TABLE "customer_special_prices"',
    );
    expect(queryRunner.query.mock.calls[1][0]).toContain(
      'DROP COLUMN "general_discount_percentage"',
    );
  });
});

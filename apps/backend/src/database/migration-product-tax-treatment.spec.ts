import { AddProductTaxTreatment1700000000024 } from './migrations/1700000000024-AddProductTaxTreatment';

describe('AddProductTaxTreatment1700000000024', () => {
  const migration = new AddProductTaxTreatment1700000000024();
  const queryRunner = { query: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    queryRunner.query.mockResolvedValue([]);
  });

  it('backfills the existing model and adds fiscal invariants', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');

    expect(sql).toContain('ADD COLUMN "tax_treatment"');
    expect(sql).toContain("DEFAULT 'GRAVADO'");
    expect(sql).toContain('CHK_products_tax_configuration');
    expect(sql).toContain('CHK_sales_fiscal_totals');
    expect(sql).toContain(
      '"total_net" = "taxable_net" + "exempt_amount" + "non_taxed_amount"',
    );
    expect(sql).toContain("'EXENTO', 'NO_GRAVADO'");
  });

  it('refuses to silently normalize unsupported historical rates', async () => {
    queryRunner.query
      .mockResolvedValueOnce([{ id: 'product-1', iva_percentage: '13.00' }])
      .mockResolvedValueOnce([]);

    await expect(migration.up(queryRunner)).rejects.toThrow(/product-1/);
    expect(queryRunner.query).toHaveBeenCalledTimes(2);
  });

  it('restores the legacy non-null IVA model on down', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');

    expect(sql).toContain('DROP COLUMN "tax_treatment"');
    expect(sql).toContain('ALTER COLUMN "iva_percentage" SET NOT NULL');
    expect(sql).toContain('ALTER COLUMN "iva_percentage" SET DEFAULT 21.00');
  });
});

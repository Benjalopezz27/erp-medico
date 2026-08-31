import { CreateSalesFiscalAndReceivablesTables1700000000023 } from './migrations/1700000000023-CreateSalesFiscalAndReceivablesTables';

describe('CreateSalesFiscalAndReceivablesTables1700000000023', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateSalesFiscalAndReceivablesTables1700000000023();

  beforeEach(() => jest.clearAllMocks());

  it('creates IVA, sales, fiscal and receivables in referential order', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(sql.indexOf('ADD COLUMN "iva_percentage"')).toBeLessThan(
      sql.indexOf('CREATE TABLE "sales"'),
    );
    expect(sql.indexOf('CREATE TABLE "sales"')).toBeLessThan(
      sql.indexOf('CREATE TABLE "sale_items"'),
    );
    expect(sql.indexOf('CREATE TABLE "fiscal_documents"')).toBeLessThan(
      sql.indexOf('CREATE TABLE "account_receivables"'),
    );
    expect(sql).toContain('DEFAULT 21.00');
    expect(sql).toContain('"document_type" varchar(30),');
    expect(sql).toContain('"point_of_sale" integer,');
    expect(sql).toContain('"document_number" integer,');
    expect(sql).toContain('CHK_sales_credit_contract');
    expect(sql).toContain('UQ_sale_items_product');
  });

  it('drops dependants before sales and removes the IVA column last', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(sql.indexOf('DROP TABLE "account_receivables"')).toBeLessThan(
      sql.indexOf('DROP TABLE "sales"'),
    );
    expect(sql.indexOf('DROP TABLE "sales"')).toBeLessThan(
      sql.indexOf('DROP COLUMN "iva_percentage"'),
    );
  });
});

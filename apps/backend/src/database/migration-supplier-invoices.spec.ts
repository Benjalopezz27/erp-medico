import { CreateSupplierInvoicesTables1700000000016 } from './migrations/1700000000016-CreateSupplierInvoicesTables';

describe('CreateSupplierInvoicesTables1700000000016', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateSupplierInvoicesTables1700000000016();

  beforeEach(() => jest.clearAllMocks());

  it('creates both tables, uniqueness, checks and supporting indexes', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE "supplier_invoices"');
    expect(sql).toContain('CREATE TABLE "supplier_invoice_items"');
    expect(sql).toContain('UQ_supplier_invoice_number');
    expect(sql).toContain('CHK_supplier_invoice_item_quantities');
    expect(sql).toContain('IDX_supplier_invoice_item_receipt_item');
  });

  it('drops child rows before invoice headers', async () => {
    await migration.down(queryRunner);
    expect(queryRunner.query.mock.calls.map(([sql]) => sql)).toEqual([
      'DROP TABLE "supplier_invoice_items"',
      'DROP TABLE "supplier_invoices"',
    ]);
  });
});

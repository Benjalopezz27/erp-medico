import { CreateCustomersTable1700000000021 } from './migrations/1700000000021-CreateCustomersTable';

describe('CreateCustomersTable1700000000021', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateCustomersTable1700000000021();

  beforeEach(() => jest.clearAllMocks());

  it('creates the customer domain with durable identity and commercial checks', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE "customers"');
    expect(sql).toContain('UQ_customers_document');
    expect(sql).toContain('CHK_customers_document_format');
    expect(sql).toContain('CHK_customers_document_tax');
    expect(sql).toContain('CHK_customers_credit_limit');
    expect(sql).toContain('numeric(14,2)');
    expect(sql).toContain('IDX_customers_active_created');
  });

  it('drops the table on rollback so the migration can run again', async () => {
    await migration.down(queryRunner);
    expect(queryRunner.query).toHaveBeenCalledWith('DROP TABLE "customers"');
  });
});

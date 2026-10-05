import { CreateTreasuryLedger1700000000034 } from './migrations/1700000000034-CreateTreasuryLedger';

describe('CreateTreasuryLedger1700000000034', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateTreasuryLedger1700000000034();
  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  beforeEach(() => jest.clearAllMocks());

  it('creates accounts, seeds the three channels and the ledger idempotently', async () => {
    await migration.up(queryRunner);
    const sql = sqlOf();
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "treasury_accounts"');
    for (const type of ['EFECTIVO', 'BANCOS', 'CHEQUES_CARTERA']) {
      expect(sql).toContain(`('${type}'`);
    }
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "treasury_movements"');
    expect(sql).toContain('CHK_treasury_movements_amount');
    expect(sql).toContain('IDX_treasury_movements_account_date');
  });

  it('blocks UPDATE and DELETE with a trigger', async () => {
    await migration.up(queryRunner);
    expect(sqlOf()).toContain(
      'BEFORE UPDATE OR DELETE ON "treasury_movements"',
    );
  });

  it('drops the trigger before the tables on down', async () => {
    await migration.down(queryRunner);
    const sql = sqlOf();
    expect(sql.indexOf('DROP TRIGGER')).toBeLessThan(
      sql.indexOf('DROP TABLE IF EXISTS "treasury_movements"'),
    );
    expect(sql.indexOf('"treasury_movements"')).toBeLessThan(
      sql.indexOf('DROP TABLE IF EXISTS "treasury_accounts"'),
    );
  });
});

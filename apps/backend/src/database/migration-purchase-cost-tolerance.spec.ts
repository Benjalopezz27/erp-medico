import { CreatePurchaseCostToleranceWorkflow1700000000017 } from './migrations/1700000000017-CreatePurchaseCostToleranceWorkflow';

describe('CreatePurchaseCostToleranceWorkflow1700000000017', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreatePurchaseCostToleranceWorkflow1700000000017();

  beforeEach(() => jest.clearAllMocks());

  it('creates typed settings, snapshots and structured observations', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE "purchase_settings"');
    expect(sql).toContain('cost_tolerance_percentage_snapshot');
    expect(sql).toContain('cost_variation_percentage');
    expect(sql).toContain('discount_percentage');
    expect(sql).toContain("THEN 'OBSERVADA' ELSE 'AUTORIZADA'");
  });

  it('removes dependent columns before settings', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql.indexOf('DROP COLUMN "cost_observed"')).toBeLessThan(
      sql.indexOf('DROP TABLE "purchase_settings"'),
    );
  });
});

import { CreateMarkupHierarchy1700000000019 } from './migrations/1700000000019-CreateMarkupHierarchy';

describe('CreateMarkupHierarchy1700000000019', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateMarkupHierarchy1700000000019();

  beforeEach(() => jest.clearAllMocks());

  it('creates referentially safe hierarchy, backfills products and preserves honest review provenance', async () => {
    await migration.up(queryRunner);
    const sql = queryRunner.query.mock.calls.flat().join('\n');
    expect(sql).toContain('CREATE TABLE "markup_configurations"');
    expect(sql).toContain('CHK_markup_configuration_target');
    expect(sql).toContain('ON DELETE RESTRICT');
    expect(sql).toContain('UQ_markup_configuration_global');
    expect(sql).toContain("VALUES ('GLOBAL', 0.0000)");
    expect(sql).toContain('WHERE "markup_percentage" IS NOT NULL');
    expect(sql).toContain('effective_markup_level');
    expect(sql).toContain('WHERE "markup_percentage_snapshot" IS NOT NULL');
    expect(sql).toContain('DROP COLUMN "markup_percentage"');
  });

  it('restores legacy product markup before dropping the hierarchy', async () => {
    await migration.down(queryRunner);
    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join('\n');
    expect(sql).toContain('ADD COLUMN "markup_percentage"');
    expect(sql).toContain('m."level" = \'PRODUCT\'');
    expect(sql).toContain('DROP TABLE "markup_configurations"');
  });
});

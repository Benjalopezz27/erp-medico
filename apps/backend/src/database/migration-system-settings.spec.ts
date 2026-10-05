import { CreateSystemSettings1700000000033 } from './migrations/1700000000033-CreateSystemSettings';

describe('CreateSystemSettings1700000000033', () => {
  const queryRunner = { query: jest.fn().mockResolvedValue(undefined) } as any;
  const migration = new CreateSystemSettings1700000000033();
  const sqlOf = () =>
    queryRunner.query.mock.calls.map(([statement]) => statement).join('\n');

  beforeEach(() => jest.clearAllMocks());

  it('creates system_settings idempotently', async () => {
    await migration.up(queryRunner);
    expect(sqlOf()).toContain('CREATE TABLE IF NOT EXISTS "system_settings"');
  });

  it('drops the table on down', async () => {
    await migration.down(queryRunner);
    expect(sqlOf()).toContain('DROP TABLE IF EXISTS "system_settings"');
  });
});

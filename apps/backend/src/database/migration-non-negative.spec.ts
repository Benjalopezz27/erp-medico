import { EnforceNonNegativeStock1700000000007 } from './migrations/1700000000007-EnforceNonNegativeStock';

describe('EnforceNonNegativeStock1700000000007 Migration', () => {
  let migration: EnforceNonNegativeStock1700000000007;
  let mockQueryRunner: any;

  beforeEach(() => {
    migration = new EnforceNonNegativeStock1700000000007();
    mockQueryRunner = {
      query: jest.fn(),
      createCheckConstraint: jest.fn().mockResolvedValue(undefined),
      dropCheckConstraint: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('successfully creates check constraint when no negative stock exists', async () => {
    mockQueryRunner.query.mockResolvedValueOnce([{ count: '0' }]);

    await migration.up(mockQueryRunner);

    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT COUNT(*)'),
    );
    expect(mockQueryRunner.createCheckConstraint).toHaveBeenCalledWith(
      'stocks',
      expect.objectContaining({
        name: 'CHK_stocks_current_base_stock_non_negative',
        expression: '"current_base_stock" >= 0',
      }),
    );
  });

  it('aborts and throws error if negative stock records exist prior to applying constraint', async () => {
    mockQueryRunner.query.mockResolvedValueOnce([{ count: '3' }]);

    await expect(migration.up(mockQueryRunner)).rejects.toThrow(
      /Migration 1700000000007 aborted: Found 3 stock record\(s\) with negative balance/,
    );
    expect(mockQueryRunner.createCheckConstraint).not.toHaveBeenCalled();
  });

  it('drops check constraint cleanly on down', async () => {
    await migration.down(mockQueryRunner);

    expect(mockQueryRunner.dropCheckConstraint).toHaveBeenCalledWith(
      'stocks',
      'CHK_stocks_current_base_stock_non_negative',
    );
  });
});

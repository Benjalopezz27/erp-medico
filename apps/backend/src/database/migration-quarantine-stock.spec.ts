import { CreateQuarantineStockTable1700000000009 } from './migrations/1700000000009-CreateQuarantineStockTable';

describe('CreateQuarantineStockTable1700000000009 Migration', () => {
  let migration: CreateQuarantineStockTable1700000000009;
  let mockQueryRunner: any;

  beforeEach(() => {
    migration = new CreateQuarantineStockTable1700000000009();
    mockQueryRunner = {
      createTable: jest.fn().mockResolvedValue(undefined),
      dropTable: jest.fn().mockResolvedValue(undefined),
      createCheckConstraint: jest.fn().mockResolvedValue(undefined),
      createForeignKey: jest.fn().mockResolvedValue(undefined),
      createUniqueConstraint: jest.fn().mockResolvedValue(undefined),
      createIndex: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('creates table, checks, foreign keys, and indexes on up()', async () => {
    await migration.up(mockQueryRunner);

    expect(mockQueryRunner.createTable).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'quarantine_stocks',
      }),
      true,
    );
    expect(mockQueryRunner.createCheckConstraint).toHaveBeenCalledTimes(6);
    expect(mockQueryRunner.createForeignKey).toHaveBeenCalledTimes(5);
    expect(mockQueryRunner.createUniqueConstraint).toHaveBeenCalledTimes(1);
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE UNIQUE INDEX uq_quarantine_stocks_resolution_movement'),
    );
    expect(mockQueryRunner.createIndex).toHaveBeenCalledTimes(4);
  });

  it('drops table safely on down() without CASCADE', async () => {
    await migration.down(mockQueryRunner);

    expect(mockQueryRunner.dropTable).toHaveBeenCalledWith(
      'quarantine_stocks',
      true,
      false,
      false,
    );
  });
});

import { CreateGoodsReceiptsTables1700000000015 } from './migrations/1700000000015-CreateGoodsReceiptsTables';

describe('CreateGoodsReceiptsTables1700000000015 Migration', () => {
  let migration: CreateGoodsReceiptsTables1700000000015;
  let mockQueryRunner: any;

  beforeEach(() => {
    migration = new CreateGoodsReceiptsTables1700000000015();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('creates sequence, goods_receipts, goods_receipt_items tables and indexes on up()', async () => {
    await migration.up(mockQueryRunner);

    // Creates sequence
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE SEQUENCE "goods_receipt_number_seq"'),
    );

    // Creates goods_receipts table
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE "goods_receipts"'),
    );

    // Creates goods_receipt_items table
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE "goods_receipt_items"'),
    );

    // Creates indexes
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'CREATE INDEX "IDX_goods_receipts_purchase_order_id"',
      ),
    );
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE INDEX "IDX_goods_receipts_supplier_id"'),
    );
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'CREATE INDEX "IDX_goods_receipt_items_receipt_id"',
      ),
    );
  });

  it('reverts goods_receipt_items, goods_receipts and sequence cleanly on down()', async () => {
    await migration.down(mockQueryRunner);

    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'DROP TABLE "goods_receipt_items";',
    );
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'DROP TABLE "goods_receipts";',
    );
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'DROP SEQUENCE "goods_receipt_number_seq";',
    );
  });
});

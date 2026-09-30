import { ReceiptNumberService } from './receipt-number.service';

describe('ReceiptNumberService', () => {
  const service = new ReceiptNumberService();
  const txManager = (rows: unknown, active = true) =>
    ({
      queryRunner: { isTransactionActive: active },
      query: jest.fn(async () => rows),
    }) as any;

  it('formats consecutive numbers as 0001-NNNNNNNN', async () => {
    // TypeORM/pg devuelve [filas, cantidad] para UPDATE ... RETURNING.
    const m1 = txManager([[{ last_number: 1 }], 1]);
    const m2 = txManager([[{ last_number: 2 }], 1]);
    expect(await service.next(m1)).toBe('0001-00000001');
    expect(await service.next(m2)).toBe('0001-00000002');
  });

  it('increments the counter row inside the supplied transaction', async () => {
    const m = txManager([[{ last_number: 50 }], 1]);
    expect(await service.next(m)).toBe('0001-00000050');
    expect(m.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "receipt_counters"'),
      [1],
    );
  });

  it('fails if the counter row is missing', async () => {
    await expect(service.next(txManager([[], 0]))).rejects.toThrow('counter');
  });

  it('requires an active transaction so a rollback returns the number', async () => {
    await expect(
      service.next(txManager([[{ last_number: 1 }], 1], false)),
    ).rejects.toThrow('requires an active transaction');
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReceivablesQueryService } from './receivables-query.service';
import { QueryDebtorsDto } from './dto/query-account.dto';

describe('ReceivablesQueryService.listDebtors sorting', () => {
  let query: jest.Mock;
  let service: ReceivablesQueryService;

  beforeEach(() => {
    query = jest
      .fn()
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);
    service = new ReceivablesQueryService({ query } as any);
  });

  const rowsSql = () => query.mock.calls[1][0] as string;

  it('orders by the whitelisted alias with customer_id tie-break', async () => {
    await service.listDebtors({
      sortBy: 'aging31to60',
      sortOrder: 'desc',
      page: 1,
      limit: 10,
    });
    expect(rowsSql()).toContain('ORDER BY days_31_60 DESC, customer_id DESC');
  });

  it('keeps the default order without sortBy', async () => {
    await service.listDebtors({ page: 1, limit: 10 });
    expect(rowsSql()).toContain(
      'ORDER BY total_balance DESC, business_name ASC, customer_id ASC',
    );
  });

  it('rejects invalid sortBy at DTO level', async () => {
    const dto = plainToInstance(QueryDebtorsDto, { sortBy: 'x; DROP' });
    expect((await validate(dto)).map((e) => e.property)).toContain('sortBy');
  });
});

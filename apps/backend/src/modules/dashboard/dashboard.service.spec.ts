import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const query = jest.fn();
  const service = new DashboardService({ query } as any);

  it('maps the five KPIs, keeping money as exact decimals and counts as numbers', async () => {
    query
      .mockResolvedValueOnce([{ today: '100.00', month: '150.00' }])
      .mockResolvedValueOnce([{ count: '12' }])
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([{ count: '5' }]);
    await expect(service.getKpis()).resolves.toEqual({
      salesToday: '100.00',
      salesMonth: '150.00',
      lowStockProducts: 12,
      observedSupplierInvoices: 3,
      checksDueSoon: 5,
    });
  });

  it('uses the same rules as the stock and checks modules', async () => {
    query.mockClear();
    query.mockResolvedValue([{ count: '0', today: '0', month: '0' }]);
    await service.getKpis();
    const sqls = query.mock.calls.map(([sql]) => sql as string).join('\n');
    expect(sqls).toContain("s.status = 'CONFIRMADA'");
    expect(sqls).toContain('COALESCE(st.current_base_stock, 0) <= p.min_stock');
    expect(sqls).toContain("p.status = 'ACTIVE'");
    expect(sqls).toContain("status = 'OBSERVADA'");
    expect(sqls).toContain("('RECIBIDO', 'EN_CARTERA')");
    expect(sqls).toContain("CURRENT_DATE + INTERVAL '7 days'");
  });
});

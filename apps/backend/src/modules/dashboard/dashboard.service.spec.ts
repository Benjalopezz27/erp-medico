import { DashboardActivityType, UserRole } from '@erp/shared-types';
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

  describe('getActivity', () => {
    const row = (over: Record<string, unknown>) => ({
      type: DashboardActivityType.SALE_CONFIRMED,
      ref_id: 'ref-1',
      t1: 'V-1',
      t2: 'Cliente SA',
      t3: null,
      t4: null,
      amount: '1234.5',
      occurred_at: new Date('2026-10-05T12:00:00.000Z'),
      user_name: 'Ana',
      ...over,
    });

    beforeEach(() => query.mockReset());

    it('maps every event type with exact decimal amounts, ISO dates and links', async () => {
      query.mockResolvedValue([
        row({}),
        row({ type: DashboardActivityType.SALE_CANCELLED }),
        row({
          type: DashboardActivityType.STOCK_MOVEMENT,
          ref_id: 'mov-1',
          t4: 'prod-1',
          t1: 'Gasa',
          t2: 'MERMA',
          t3: '-3.00',
          amount: null,
        }),
        row({
          type: DashboardActivityType.PAYMENT_RECEIVED,
          ref_id: 'rec-1',
          t1: 'R-9',
        }),
        row({
          type: DashboardActivityType.TREASURY_MOVEMENT,
          t1: 'Pago alquiler',
          t2: 'EGRESO',
          amount: '10',
        }),
      ]);

      const [sale, cancelled, stock, payment, treasury] =
        await service.getActivity(UserRole.ADMINISTRADOR, 15);

      expect(sale).toMatchObject({
        id: 'SALE_CONFIRMED:ref-1',
        title: 'Venta V-1',
        detail: 'Cliente SA',
        amount: '1234.50',
        occurredAt: '2026-10-05T12:00:00.000Z',
        userName: 'Ana',
        link: { to: '/sales/$id', params: { id: 'ref-1' } },
      });
      expect(cancelled.title).toBe('Venta V-1 anulada');
      expect(stock).toMatchObject({
        id: 'STOCK_MOVEMENT:mov-1',
        title: 'Merma',
        detail: 'Gasa · -3.00',
        amount: null,
        link: { to: '/stock/$productId', params: { productId: 'prod-1' } },
      });
      expect(payment).toMatchObject({
        title: 'Cobro R-9',
        link: { to: '/receipts/$id', params: { id: 'rec-1' } },
      });
      expect(treasury).toMatchObject({
        title: 'Pago alquiler',
        detail: 'Egreso',
        amount: '10.00',
        link: { to: '/treasury' },
      });
    });

    it('gives each stock movement of the same product a distinct event id', async () => {
      const movement = (id: string) =>
        row({
          type: DashboardActivityType.STOCK_MOVEMENT,
          ref_id: id,
          t4: 'prod-1',
          t2: 'MERMA',
          t3: '1.00',
          amount: null,
        });
      query.mockResolvedValue([movement('mov-1'), movement('mov-2')]);
      const items = await service.getActivity(UserRole.ADMINISTRADOR, 15);
      expect(new Set(items.map((i) => i.id)).size).toBe(2);
      expect(items.map((i) => i.link.params)).toEqual([
        { productId: 'prod-1' },
        { productId: 'prod-1' },
      ]);
    });

    it('passes the limit, orders by date and avoids duplicated sale/payment events', async () => {
      query.mockResolvedValue([]);
      await service.getActivity(UserRole.ADMINISTRADOR, 7);
      const [sql, params] = query.mock.calls[0];
      expect(params).toEqual([7]);
      expect(sql).toContain('ORDER BY occurred_at DESC LIMIT $1');
      expect(sql).toContain("s.status = 'CONFIRMADA'");
      expect(sql).toContain("s.status = 'CANCELADA'");
      expect(sql).toContain("NOT IN ('SALIDA_VENTA', 'DEVOLUCION_CLIENTE')");
      expect(sql).toContain("NOT IN ('SALE', 'PAYMENT')");
      expect(sql).not.toContain("'BORRADOR'");
    });

    it('never queries receipts or treasury for a seller', async () => {
      query.mockResolvedValue([]);
      await service.getActivity(UserRole.VENDEDOR, 15);
      const sql = query.mock.calls[0][0] as string;
      expect(sql).toContain('FROM sales s');
      expect(sql).toContain('FROM stock_movements');
      expect(sql).not.toContain('FROM receipts');
      expect(sql).not.toContain('FROM treasury_movements');
    });

    it('returns an empty list when there is no activity', async () => {
      query.mockResolvedValue([]);
      await expect(
        service.getActivity(UserRole.ADMINISTRADOR, 15),
      ).resolves.toEqual([]);
    });
  });
});

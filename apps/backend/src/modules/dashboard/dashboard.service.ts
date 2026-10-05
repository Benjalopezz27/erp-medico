import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import { IDashboardKpis } from '@erp/shared-types';

const TZ = `'America/Argentina/Buenos_Aires'`;
const SALE_DAY = `(s.created_at AT TIME ZONE ${TZ})::date`;
const TODAY = `(now() AT TIME ZONE ${TZ})::date`;

const count = (rows: { count: string }[]): number => Number(rows[0].count);

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getKpis(): Promise<IDashboardKpis> {
    const q = <T>(sql: string): Promise<T[]> => this.dataSource.query(sql);
    const [sales, lowStock, observed, checks] = await Promise.all([
      q<{ today: string; month: string }>(`
        SELECT COALESCE(SUM(s.total_gross) FILTER (WHERE ${SALE_DAY} = ${TODAY}), 0) AS today,
               COALESCE(SUM(s.total_gross), 0) AS month
        FROM sales s
        WHERE s.status = 'CONFIRMADA'
          AND date_trunc('month', ${SALE_DAY}) = date_trunc('month', ${TODAY})`),
      // Misma regla que StockService: stock <= mínimo, solo productos activos.
      q<{ count: string }>(`
        SELECT COUNT(*) AS count
        FROM products p
        LEFT JOIN stocks st ON st.product_id = p.id
        WHERE p.status = 'ACTIVE' AND COALESCE(st.current_base_stock, 0) <= p.min_stock`),
      q<{ count: string }>(
        `SELECT COUNT(*) AS count FROM supplier_invoices WHERE status = 'OBSERVADA'`,
      ),
      // Misma ventana que ChecksService.list (CURRENT_DATE de la base).
      q<{ count: string }>(`
        SELECT COUNT(*) AS count FROM checks
        WHERE status IN ('RECIBIDO', 'EN_CARTERA')
          AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`),
    ]);
    return {
      salesToday: new Decimal(sales[0].today).toFixed(2),
      salesMonth: new Decimal(sales[0].month).toFixed(2),
      lowStockProducts: count(lowStock),
      observedSupplierInvoices: count(observed),
      checksDueSoon: count(checks),
    };
  }
}

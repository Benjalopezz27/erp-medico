import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import {
  DashboardActivityType,
  IDashboardActivity,
  IDashboardActivityLink,
  IDashboardKpis,
  StockMovementType,
  TreasuryMovementType,
  UserRole,
} from '@erp/shared-types';

const TZ = `'America/Argentina/Buenos_Aires'`;
const SALE_DAY = `(s.created_at AT TIME ZONE ${TZ})::date`;
const TODAY = `(now() AT TIME ZONE ${TZ})::date`;

const STOCK_LABELS: Record<StockMovementType, string> = {
  [StockMovementType.ENTRADA_COMPRA]: 'Entrada por compra',
  [StockMovementType.SALIDA_VENTA]: 'Salida por venta',
  [StockMovementType.MERMA]: 'Merma',
  [StockMovementType.AJUSTE_ENTRADA]: 'Ajuste de entrada',
  [StockMovementType.AJUSTE_SALIDA]: 'Ajuste de salida',
  [StockMovementType.DEVOLUCION_CLIENTE]: 'Devolución de cliente',
};

// Cada rama ya viene ordenada y limitada: el UNION no pasa de 4 × limit filas.
// Columnas: type, ref_id (id único del evento), t1, t2, t3, t4 (id de destino cuando difiere),
// amount, occurred_at, user_name.
const BRANCH_SALE = (status: string, type: string, at: string) => `(
  SELECT '${type}' AS type, s.id::text AS ref_id, s.sale_number AS t1,
         COALESCE(c.business_name, 'Consumidor final') AS t2, NULL::text AS t3, NULL::text AS t4,
         s.total_gross AS amount, ${at} AS occurred_at, u.name AS user_name
  FROM sales s
  LEFT JOIN customers c ON c.id = s.customer_id
  LEFT JOIN users u ON u.id = s.user_id
  WHERE s.status = '${status}'
  ORDER BY ${at} DESC LIMIT $1)`;

// Stock de venta y devolución ya está representado por el evento de venta.
const BRANCH_STOCK = `(
  SELECT 'STOCK_MOVEMENT' AS type, sm.id::text AS ref_id, p.name AS t1,
         sm.movement_type AS t2, sm.quantity_base::text AS t3, sm.product_id::text AS t4,
         NULL::numeric AS amount, sm.created_at AS occurred_at, u.name AS user_name
  FROM stock_movements sm
  JOIN products p ON p.id = sm.product_id
  LEFT JOIN users u ON u.id = sm.user_id
  WHERE sm.movement_type NOT IN ('SALIDA_VENTA', 'DEVOLUCION_CLIENTE')
  ORDER BY sm.created_at DESC LIMIT $1)`;

const BRANCH_RECEIPT = `(
  SELECT 'PAYMENT_RECEIVED' AS type, r.id::text AS ref_id, r.receipt_number AS t1,
         c.business_name AS t2, NULL::text AS t3, NULL::text AS t4,
         r.total_amount AS amount, r.created_at AS occurred_at, u.name AS user_name
  FROM receipts r
  JOIN customers c ON c.id = r.customer_id
  LEFT JOIN users u ON u.id = r.user_id
  ORDER BY r.created_at DESC LIMIT $1)`;

// Venta y cobro ya están representados por su propio evento.
const BRANCH_TREASURY = `(
  SELECT 'TREASURY_MOVEMENT' AS type, tm.id::text AS ref_id, tm.concept AS t1,
         tm.movement_type AS t2, NULL::text AS t3, NULL::text AS t4,
         tm.amount AS amount, tm.created_at AS occurred_at, u.name AS user_name
  FROM treasury_movements tm
  LEFT JOIN users u ON u.id = tm.user_id
  WHERE tm.reference_type IS NULL OR tm.reference_type NOT IN ('SALE', 'PAYMENT')
  ORDER BY tm.created_at DESC LIMIT $1)`;

interface ActivityRow {
  type: DashboardActivityType;
  ref_id: string;
  t1: string;
  t2: string;
  t3: string | null;
  t4: string | null;
  amount: string | null;
  occurred_at: Date;
  user_name: string | null;
}

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

  async getActivity(
    role: UserRole,
    limit: number,
  ): Promise<IDashboardActivity> {
    const branches = [
      BRANCH_SALE(
        'CONFIRMADA',
        DashboardActivityType.SALE_CONFIRMED,
        's.created_at',
      ),
      BRANCH_SALE(
        'CANCELADA',
        DashboardActivityType.SALE_CANCELLED,
        's.updated_at',
      ),
      BRANCH_STOCK,
      // El vendedor solo ve ventas y stock: cobros y tesorería ni se consultan.
      ...(role === UserRole.ADMINISTRADOR
        ? [BRANCH_RECEIPT, BRANCH_TREASURY]
        : []),
    ];
    const rows: ActivityRow[] = await this.dataSource.query(
      `SELECT * FROM (${branches.join(' UNION ALL ')}) activity
       ORDER BY occurred_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map((row) => this.toItem(row));
  }

  private toItem(row: ActivityRow): IDashboardActivity[number] {
    const base = {
      id: `${row.type}:${row.ref_id}`,
      type: row.type,
      amount: row.amount === null ? null : new Decimal(row.amount).toFixed(2),
      occurredAt: new Date(row.occurred_at).toISOString(),
      userName: row.user_name,
    };
    switch (row.type) {
      case DashboardActivityType.SALE_CONFIRMED:
        return {
          ...base,
          title: `Venta ${row.t1}`,
          detail: row.t2,
          link: this.link('/sales/$id', { id: row.ref_id }),
        };
      case DashboardActivityType.SALE_CANCELLED:
        return {
          ...base,
          title: `Venta ${row.t1} anulada`,
          detail: row.t2,
          link: this.link('/sales/$id', { id: row.ref_id }),
        };
      case DashboardActivityType.STOCK_MOVEMENT:
        return {
          ...base,
          title: STOCK_LABELS[row.t2 as StockMovementType] ?? row.t2,
          detail: `${row.t1} · ${row.t3}`,
          link: this.link('/stock/$productId', { productId: row.t4 as string }),
        };
      case DashboardActivityType.PAYMENT_RECEIVED:
        return {
          ...base,
          title: `Cobro ${row.t1}`,
          detail: row.t2,
          link: this.link('/receipts/$id', { id: row.ref_id }),
        };
      default:
        return {
          ...base,
          title: row.t1,
          detail:
            row.t2 === TreasuryMovementType.INGRESO ? 'Ingreso' : 'Egreso',
          link: this.link('/treasury'),
        };
    }
  }

  private link(
    to: string,
    params?: Record<string, string>,
  ): IDashboardActivityLink {
    return params ? { to, params } : { to };
  }
}

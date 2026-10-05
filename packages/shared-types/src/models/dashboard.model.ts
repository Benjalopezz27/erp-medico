export interface IDashboardKpis {
  /** Decimal con 2 decimales: ventas confirmadas del día (total con IVA). */
  salesToday: string;
  salesMonth: string;
  lowStockProducts: number;
  observedSupplierInvoices: number;
  checksDueSoon: number;
}

export enum DashboardActivityType {
  SALE_CONFIRMED = 'SALE_CONFIRMED',
  SALE_CANCELLED = 'SALE_CANCELLED',
  STOCK_MOVEMENT = 'STOCK_MOVEMENT',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  TREASURY_MOVEMENT = 'TREASURY_MOVEMENT',
}

export interface IDashboardActivityLink {
  /** Ruta del frontend, p. ej. `/sales/$id`. */
  to: string;
  params?: Record<string, string>;
}

export interface IDashboardActivityItem {
  id: string;
  type: DashboardActivityType;
  title: string;
  detail: string;
  /** Decimal con 2 decimales; null cuando el evento no tiene monto (stock). */
  amount: string | null;
  /** ISO 8601. */
  occurredAt: string;
  userName: string | null;
  link: IDashboardActivityLink;
}

export type IDashboardActivity = IDashboardActivityItem[];

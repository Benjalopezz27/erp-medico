export interface IDashboardKpis {
  /** Decimal con 2 decimales: ventas confirmadas del día (total con IVA). */
  salesToday: string;
  salesMonth: string;
  lowStockProducts: number;
  observedSupplierInvoices: number;
  checksDueSoon: number;
}

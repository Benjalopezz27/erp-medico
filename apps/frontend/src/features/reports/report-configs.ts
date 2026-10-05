import { CheckStatus, PaymentMethod, ProductStatus, PurchaseOrderStatus } from '@erp/shared-types';

export type ReportFilterDef = { key: string; label: string } & (
  | { kind: 'date' }
  | { kind: 'select'; options: [value: string, label: string][] }
  | { kind: 'entity'; entity: 'customer' | 'supplier' | 'category' | 'product' }
  | { kind: 'checkbox' }
);

export interface ReportConfig {
  type: string;
  title: string;
  description: string;
  filters: ReportFilterDef[];
}

const values = (e: Record<string, string>): [string, string][] =>
  Object.values(e).map((v) => [v, v.replace(/_/g, ' ')]);

const range = (from = 'from', to = 'to'): ReportFilterDef[] => [
  { key: from, label: 'Desde', kind: 'date' },
  { key: to, label: 'Hasta', kind: 'date' },
];
const customer: ReportFilterDef = {
  key: 'customerId',
  label: 'Cliente',
  kind: 'entity',
  entity: 'customer',
};
const supplier: ReportFilterDef = {
  key: 'supplierId',
  label: 'Proveedor',
  kind: 'entity',
  entity: 'supplier',
};
const category: ReportFilterDef = {
  key: 'categoryId',
  label: 'Categoría',
  kind: 'entity',
  entity: 'category',
};
const product: ReportFilterDef = {
  key: 'productId',
  label: 'Producto',
  kind: 'entity',
  entity: 'product',
};
const paymentMethod: ReportFilterDef = {
  key: 'paymentMethod',
  label: 'Medio de pago',
  kind: 'select',
  options: values(PaymentMethod),
};

export const REPORT_CONFIGS: ReportConfig[] = [
  {
    type: 'sales',
    title: 'Ventas por período',
    description: 'Ventas confirmadas con neto, IVA, total y estado de facturación.',
    filters: [...range(), customer, paymentMethod],
  },
  {
    type: 'profitability',
    title: 'Rentabilidad por producto',
    description: 'Margen bruto por producto (costo actual del producto).',
    filters: [...range(), category, product],
  },
  {
    type: 'stock-valuation',
    title: 'Stock y valorización',
    description: 'Inventario actual valorizado al costo.',
    filters: [
      category,
      { key: 'status', label: 'Estado', kind: 'select', options: values(ProductStatus) },
      { key: 'belowMin', label: 'Solo bajo mínimo', kind: 'checkbox' },
    ],
  },
  {
    type: 'stock-movements',
    title: 'Movimientos de stock',
    description: 'Historial del ledger de stock.',
    filters: [
      ...range(),
      product,
      {
        key: 'movementType',
        label: 'Tipo',
        kind: 'select',
        options: values({
          ENTRADA_COMPRA: 'ENTRADA_COMPRA',
          SALIDA_VENTA: 'SALIDA_VENTA',
          MERMA: 'MERMA',
          AJUSTE_ENTRADA: 'AJUSTE_ENTRADA',
          AJUSTE_SALIDA: 'AJUSTE_SALIDA',
          DEVOLUCION_CLIENTE: 'DEVOLUCION_CLIENTE',
        }),
      },
    ],
  },
  {
    type: 'purchases',
    title: 'Compras por proveedor',
    description: 'Órdenes de compra con monto estimado y real.',
    filters: [
      ...range(),
      supplier,
      { key: 'status', label: 'Estado', kind: 'select', options: values(PurchaseOrderStatus) },
    ],
  },
  {
    type: 'receivables-aging',
    title: 'Aging de cuentas corrientes',
    description: 'Deuda de clientes por antigüedad.',
    filters: [
      customer,
      {
        key: 'status',
        label: 'Estado',
        kind: 'select',
        options: [
          ['PENDIENTE', 'PENDIENTE'],
          ['PARCIAL', 'PARCIAL'],
        ],
      },
    ],
  },
  {
    type: 'collections',
    title: 'Cobranzas y recibos',
    description: 'Cobros registrados con recibo y facturas canceladas.',
    filters: [...range(), customer, paymentMethod],
  },
  {
    type: 'checks-portfolio',
    title: 'Cheques en cartera',
    description: 'Estado y vencimiento de los cheques recibidos.',
    filters: [
      { key: 'status', label: 'Estado', kind: 'select', options: values(CheckStatus) },
      ...range('dueFrom', 'dueTo').map((f) => ({ ...f, label: `Vence ${f.label.toLowerCase()}` })),
    ],
  },
  {
    type: 'supplier-invoices',
    title: 'Facturas de proveedor pendientes',
    description: 'Facturas observadas y autorizadas sin confirmar.',
    filters: [
      supplier,
      {
        key: 'status',
        label: 'Estado',
        kind: 'select',
        options: [
          ['OBSERVADA', 'OBSERVADA'],
          ['AUTORIZADA', 'AUTORIZADA'],
        ],
      },
    ],
  },
];

export const findReportConfig = (type: string | undefined): ReportConfig | undefined =>
  REPORT_CONFIGS.find((c) => c.type === type);

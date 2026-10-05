import { PaymentMethod } from '@erp/shared-types';
import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const salesReport: SqlReportSpec = {
  type: 'sales',
  title: 'Ventas por período',
  columns: [
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'saleNumber', header: 'N° Venta' },
    { key: 'customer', header: 'Cliente', width: 30 },
    { key: 'netTotal', header: 'Subtotal Neto', type: 'money' },
    { key: 'iva', header: 'IVA', type: 'money' },
    { key: 'total', header: 'Total', type: 'money' },
    { key: 'billingStatus', header: 'Facturación' },
  ],
  totals: ['netTotal', 'iva', 'total'],
  build: (f) => {
    const where = new WhereBuilder()
      .add(`s.status = ?`, 'CONFIRMADA')
      .dateRange('s.created_at', f)
      .addIf('s.customer_id = ?', parseUuid(f.customerId, 'customerId'))
      .addIf(
        's.payment_method = ?',
        oneOf(f.paymentMethod, Object.values(PaymentMethod), 'paymentMethod'),
      );
    return {
      sql: `
        SELECT to_char(s.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') AS "date",
               s.sale_number AS "saleNumber",
               c.business_name AS "customer",
               s.total_net AS "netTotal",
               s.iva_total AS "iva",
               s.total_gross AS "total",
               COALESCE(fd.arca_status, 'SIN_COMPROBANTE') AS "billingStatus"
        FROM sales s
        JOIN customers c ON c.id = s.customer_id
        LEFT JOIN fiscal_documents fd ON fd.sale_id = s.id AND fd.sale_return_id IS NULL
        ${where.sql()}
        ORDER BY s.created_at DESC, s.sale_number DESC`,
      params: where.params,
    };
  },
};

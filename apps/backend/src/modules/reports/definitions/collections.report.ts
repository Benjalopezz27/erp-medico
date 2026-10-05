import { PaymentMethod } from '@erp/shared-types';
import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const collectionsReport: SqlReportSpec = {
  type: 'collections',
  title: 'Cobranzas y recibos',
  columns: [
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'receiptNumber', header: 'N° Recibo' },
    { key: 'customer', header: 'Cliente', width: 30 },
    { key: 'amount', header: 'Monto', type: 'money' },
    { key: 'paymentMethod', header: 'Medio de pago' },
    { key: 'invoices', header: 'Facturas canceladas', width: 30 },
  ],
  totals: ['amount'],
  build: (f) => {
    const where = new WhereBuilder()
      .add(`p.status = ?`, 'REGISTRADO')
      .dateRange('p.created_at', f)
      .addIf('p.customer_id = ?', parseUuid(f.customerId, 'customerId'))
      .addIf(
        'p.payment_method = ?',
        oneOf(f.paymentMethod, Object.values(PaymentMethod), 'paymentMethod'),
      );
    return {
      sql: `
        SELECT to_char(p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') AS "date",
               r.receipt_number AS "receiptNumber",
               c.business_name AS "customer",
               p.total_amount AS "amount",
               p.payment_method AS "paymentMethod",
               (SELECT string_agg(ar.document_reference, ', ' ORDER BY ar.document_reference)
                  FROM payment_allocations pa
                  JOIN account_receivables ar ON ar.id = pa.account_receivable_id
                 WHERE pa.payment_id = p.id AND ar.status = 'CANCELADO') AS "invoices"
        FROM payments p
        JOIN customers c ON c.id = p.customer_id
        LEFT JOIN receipts r ON r.payment_id = p.id
        ${where.sql()}
        ORDER BY p.created_at DESC, r.receipt_number DESC`,
      params: where.params,
    };
  },
};

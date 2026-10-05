import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

const STATUSES = ['PENDIENTE', 'PARCIAL'];
const TODAY = `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`;
// Días de atraso; lo no vencido cae en el primer tramo (0-30).
const OVERDUE = `GREATEST(${TODAY} - COALESCE(ar.due_date, ar.created_at::date), 0)`;

export const receivablesAgingReport: SqlReportSpec = {
  type: 'receivables-aging',
  title: 'Aging de cuentas corrientes',
  columns: [
    { key: 'customer', header: 'Cliente', width: 30 },
    { key: 'invoice', header: 'Factura' },
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'dueDate', header: 'Vencimiento', type: 'date' },
    { key: 'bucket0to30', header: '0-30 días', type: 'money' },
    { key: 'bucket31to60', header: '31-60 días', type: 'money' },
    { key: 'bucketOver60', header: '+60 días', type: 'money' },
    { key: 'balance', header: 'Saldo total', type: 'money' },
  ],
  totals: ['bucket0to30', 'bucket31to60', 'bucketOver60', 'balance'],
  build: (f) => {
    const status = oneOf(f.status, STATUSES, 'status');
    const where = new WhereBuilder().addIf(
      'ar.customer_id = ?',
      parseUuid(f.customerId, 'customerId'),
    );
    if (status) where.add('ar.status = ?', status);
    else where.raw(`ar.status IN ('PENDIENTE', 'PARCIAL')`);
    return {
      sql: `
        SELECT c.business_name AS "customer", ar.document_reference AS "invoice",
               to_char(ar.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') AS "date",
               to_char(COALESCE(ar.due_date, ar.created_at::date), 'DD/MM/YYYY') AS "dueDate",
               CASE WHEN ${OVERDUE} <= 30 THEN ar.current_balance ELSE 0 END AS "bucket0to30",
               CASE WHEN ${OVERDUE} BETWEEN 31 AND 60 THEN ar.current_balance ELSE 0 END AS "bucket31to60",
               CASE WHEN ${OVERDUE} > 60 THEN ar.current_balance ELSE 0 END AS "bucketOver60",
               ar.current_balance AS "balance"
        FROM account_receivables ar
        JOIN customers c ON c.id = ar.customer_id
        ${where.sql()}
        ORDER BY c.business_name, COALESCE(ar.due_date, ar.created_at::date)`,
      params: where.params,
    };
  },
};

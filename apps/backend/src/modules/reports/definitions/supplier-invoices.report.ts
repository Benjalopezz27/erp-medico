import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

// US-45 nombra PENDIENTE_FACTURACION, que no existe en facturas de proveedor:
// "pendiente" es la factura AUTORIZADA que aún no se confirmó (ver proposal.md).
const STATUSES = ['OBSERVADA', 'AUTORIZADA'];

export const supplierInvoicesReport: SqlReportSpec = {
  type: 'supplier-invoices',
  title: 'Facturas de proveedor observadas y pendientes',
  columns: [
    { key: 'supplier', header: 'Proveedor', width: 30 },
    { key: 'invoiceNumber', header: 'N° Factura' },
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'amount', header: 'Monto', type: 'money' },
    { key: 'differencePct', header: 'Diferencia %', type: 'number' },
    { key: 'status', header: 'Estado' },
    { key: 'daysPending', header: 'Días pendiente', type: 'number' },
  ],
  build: (f) => {
    const status = oneOf(f.status, STATUSES, 'status');
    const where = new WhereBuilder().addIf(
      'si.supplier_id = ?',
      parseUuid(f.supplierId, 'supplierId'),
    );
    if (status) where.add('si.status = ?', status);
    else where.raw(`si.status IN ('OBSERVADA', 'AUTORIZADA')`);
    return {
      sql: `
        SELECT s.business_name AS "supplier", si.invoice_number AS "invoiceNumber",
               to_char(si.invoice_date, 'DD/MM/YYYY') AS "date",
               si.total_amount AS "amount",
               (SELECT COALESCE(MAX(ABS(i.cost_variation_percentage)), 0)
                  FROM supplier_invoice_items i WHERE i.supplier_invoice_id = si.id) AS "differencePct",
               si.status AS "status",
               ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - si.invoice_date)::int AS "daysPending"
        FROM supplier_invoices si
        JOIN suppliers s ON s.id = si.supplier_id
        ${where.sql()}
        ORDER BY si.invoice_date, si.invoice_number`,
      params: where.params,
    };
  },
};

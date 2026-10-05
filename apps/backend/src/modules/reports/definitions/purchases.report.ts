import { PurchaseOrderStatus } from '@erp/shared-types';
import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const purchasesReport: SqlReportSpec = {
  type: 'purchases',
  title: 'Compras por proveedor',
  columns: [
    { key: 'orderNumber', header: 'N° OC' },
    { key: 'supplier', header: 'Proveedor', width: 30 },
    { key: 'issuedAt', header: 'Fecha emisión', type: 'date' },
    { key: 'receivedAt', header: 'Fecha recepción', type: 'date' },
    { key: 'estimated', header: 'Monto estimado', type: 'money' },
    { key: 'actual', header: 'Monto real', type: 'money' },
    { key: 'status', header: 'Estado' },
  ],
  build: (f) => {
    const where = new WhereBuilder()
      .dateRange('COALESCE(po.emitted_at, po.created_at)', f)
      .addIf('po.supplier_id = ?', parseUuid(f.supplierId, 'supplierId'))
      .addIf(
        'po.status = ?',
        oneOf(f.status, Object.values(PurchaseOrderStatus), 'status'),
      );
    return {
      sql: `
        SELECT po.order_number AS "orderNumber", s.business_name AS "supplier",
               to_char(COALESCE(po.emitted_at, po.created_at) AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY') AS "issuedAt",
               (SELECT to_char(MAX(gr.created_at) AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY')
                  FROM goods_receipts gr WHERE gr.purchase_order_id = po.id) AS "receivedAt",
               po.total_net AS "estimated",
               (SELECT SUM(si.total_amount) FROM supplier_invoices si
                 WHERE si.purchase_order_id = po.id
                   AND si.status IN ('AUTORIZADA', 'CONFIRMADA')) AS "actual",
               po.status AS "status"
        FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        ${where.sql()}
        ORDER BY COALESCE(po.emitted_at, po.created_at) DESC, po.order_number DESC`,
      params: where.params,
    };
  },
};

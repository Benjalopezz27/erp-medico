import { StockMovementType } from '@erp/shared-types';
import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const stockMovementsReport: SqlReportSpec = {
  type: 'stock-movements',
  title: 'Movimientos de stock',
  columns: [
    { key: 'date', header: 'Fecha', type: 'date' },
    { key: 'product', header: 'Producto', width: 32 },
    { key: 'type', header: 'Tipo' },
    { key: 'quantity', header: 'Cantidad base', type: 'number' },
    { key: 'previousStock', header: 'Stock anterior', type: 'number' },
    { key: 'subsequentStock', header: 'Stock posterior', type: 'number' },
    { key: 'reason', header: 'Motivo', width: 30 },
    { key: 'user', header: 'Usuario' },
  ],
  build: (f) => {
    const where = new WhereBuilder()
      .dateRange('m.created_at', f)
      .addIf('m.product_id = ?', parseUuid(f.productId, 'productId'))
      .addIf(
        'm.movement_type = ?',
        oneOf(f.movementType, Object.values(StockMovementType), 'movementType'),
      );
    return {
      sql: `
        SELECT to_char(m.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI') AS "date",
               p.name AS "product", m.movement_type AS "type",
               m.quantity_base AS "quantity", m.previous_stock AS "previousStock",
               m.subsequent_stock AS "subsequentStock",
               COALESCE(m.reason, m.document_reference) AS "reason",
               u.name AS "user"
        FROM stock_movements m
        JOIN products p ON p.id = m.product_id
        LEFT JOIN users u ON u.id = m.user_id
        ${where.sql()}
        ORDER BY m.created_at DESC, m.id DESC`,
      params: where.params,
    };
  },
};

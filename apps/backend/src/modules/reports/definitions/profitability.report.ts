import { WhereBuilder, parseUuid } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

// El costo es el actual del producto: la venta no guarda snapshot de costo (ver design.md).
export const profitabilityReport: SqlReportSpec = {
  type: 'profitability',
  title: 'Rentabilidad por producto',
  columns: [
    { key: 'product', header: 'Producto', width: 36 },
    { key: 'units', header: 'Unidades vendidas', type: 'number' },
    { key: 'cost', header: 'Costo total', type: 'money' },
    { key: 'revenue', header: 'Venta total', type: 'money' },
    { key: 'margin', header: 'Margen bruto', type: 'money' },
    { key: 'marginPct', header: 'Margen %', type: 'number' },
  ],
  totals: ['cost', 'revenue', 'margin'],
  build: (f) => {
    const where = new WhereBuilder()
      .add('s.status = ?', 'CONFIRMADA')
      .dateRange('s.created_at', f)
      .addIf('p.category_id = ?', parseUuid(f.categoryId, 'categoryId'))
      .addIf('p.id = ?', parseUuid(f.productId, 'productId'));
    return {
      sql: `
        SELECT "product", "units", "cost", "revenue", "revenue" - "cost" AS "margin",
               CASE WHEN "revenue" = 0 THEN 0
                    ELSE ROUND(("revenue" - "cost") / "revenue" * 100, 2) END AS "marginPct"
        FROM (
          SELECT p.name AS "product",
                 SUM(si.quantity_base) AS "units",
                 ROUND(SUM(si.quantity_base * p.cost_net), 2) AS "cost",
                 SUM(si.subtotal_net) AS "revenue"
          FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          JOIN products p ON p.id = si.product_id
          ${where.sql()}
          GROUP BY p.id, p.name
        ) t
        ORDER BY "revenue" - "cost" DESC`,
      params: where.params,
    };
  },
};

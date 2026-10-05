import { ProductStatus } from '@erp/shared-types';
import { WhereBuilder, parseUuid, oneOf } from '../query-filters';
import { SqlReportSpec } from '../sql-report';

export const stockValuationReport: SqlReportSpec = {
  type: 'stock-valuation',
  title: 'Stock actual y valorización',
  columns: [
    { key: 'code', header: 'Código' },
    { key: 'product', header: 'Producto', width: 36 },
    { key: 'stock', header: 'Stock actual', type: 'number' },
    { key: 'minStock', header: 'Stock mínimo', type: 'number' },
    { key: 'cost', header: 'Costo unitario', type: 'money' },
    { key: 'valuation', header: 'Valorización', type: 'money' },
  ],
  totals: ['valuation'],
  build: (f) => {
    const where = new WhereBuilder()
      .addIf('p.category_id = ?', parseUuid(f.categoryId, 'categoryId'))
      .addIf(
        'p.status = ?',
        oneOf(f.status, Object.values(ProductStatus), 'status'),
      );
    if (f.belowMin === 'true') {
      where.raw('COALESCE(s.current_base_stock, 0) <= p.min_stock');
    }
    return {
      sql: `
        SELECT p.internal_code AS "code", p.name AS "product",
               COALESCE(s.current_base_stock, 0) AS "stock",
               p.min_stock AS "minStock",
               p.cost_net AS "cost",
               ROUND(COALESCE(s.current_base_stock, 0) * p.cost_net, 2) AS "valuation"
        FROM products p
        LEFT JOIN stocks s ON s.product_id = p.id
        ${where.sql()}
        ORDER BY p.name`,
      params: where.params,
    };
  },
};

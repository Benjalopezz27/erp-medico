import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { resolveSort } from '../../../common/sorting/sorting';

export const STOCK_SORT_FIELDS = [
  'internalCode',
  'name',
  'category',
  'currentStock',
  'minStock',
  'status',
] as const;

export const MOVEMENT_SORT_FIELDS = [
  'createdAt',
  'movementType',
  'quantityBase',
  'previousStock',
  'subsequentStock',
  'user',
] as const;

// Same expressions the stock filters use; must mirror deriveStockStatus.
export const STOCK_CURRENT_SQL = 'COALESCE(stock.current_base_stock, 0)';
export const STOCK_STATUS_SQL = `CASE WHEN ${STOCK_CURRENT_SQL} <= 0 THEN 'CRITICAL' WHEN ${STOCK_CURRENT_SQL} <= product.min_stock THEN 'LOW' ELSE 'NORMAL' END`;

// Derived columns are selected under a `sort_*` alias so skip/take stays valid.
const STOCK_SORT_COLUMNS: Record<(typeof STOCK_SORT_FIELDS)[number], string> = {
  internalCode: 'product.internalCode',
  name: 'product.name',
  category: 'category.name',
  currentStock: 'sort_current_stock',
  minStock: 'product.minStock',
  status: 'sort_status',
};
const STOCK_SORT_EXPR: Record<string, string> = {
  sort_current_stock: STOCK_CURRENT_SQL,
  sort_status: STOCK_STATUS_SQL,
};

export const MOVEMENT_SORT_COLUMNS: Record<
  (typeof MOVEMENT_SORT_FIELDS)[number],
  string
> = {
  createdAt: 'movement.createdAt',
  movementType: 'movement.movementType',
  quantityBase: 'movement.quantityBase',
  previousStock: 'movement.previousStock',
  subsequentStock: 'movement.subsequentStock',
  user: 'user.name',
};

/** Applies the requested stock sort (+ id tie-break) or the default name order. */
export function applyStockSort<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: { sortBy?: (typeof STOCK_SORT_FIELDS)[number]; sortOrder?: string },
): void {
  const sort = resolveSort(STOCK_SORT_COLUMNS, query.sortBy, query.sortOrder);
  if (!sort) {
    qb.orderBy('product.name', 'ASC').addOrderBy('product.id', 'ASC');
    return;
  }
  const expr = STOCK_SORT_EXPR[sort.column];
  if (expr) qb.addSelect(expr, sort.column);
  qb.orderBy(sort.column, sort.direction).addOrderBy(
    'product.id',
    sort.direction,
  );
}

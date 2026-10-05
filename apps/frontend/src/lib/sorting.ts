import { useMemo, useState } from 'react';
import type { SortOrder } from '@erp/shared-types';

export interface SortState<TField extends string = string> {
  sortBy?: TField;
  sortOrder?: SortOrder;
}

/** Click cycle: none → ASC → DESC → none (default order). Another column restarts at ASC. */
export function nextSort<TField extends string>(
  current: SortState<TField>,
  field: TField,
): SortState<TField> {
  if (current.sortBy !== field) return { sortBy: field, sortOrder: 'ASC' };
  if (current.sortOrder === 'ASC') return { sortBy: field, sortOrder: 'DESC' };
  return { sortBy: undefined, sortOrder: undefined };
}

/** For router validateSearch: keep only whitelisted fields and valid directions. */
export function parseSort<TField extends string>(
  search: Record<string, unknown>,
  fields: readonly TField[],
): SortState<TField> {
  const sortBy = fields.find((field) => field === search.sortBy);
  if (!sortBy) return {};
  const raw = typeof search.sortOrder === 'string' ? search.sortOrder.toUpperCase() : '';
  return { sortBy, sortOrder: raw === 'DESC' ? 'DESC' : 'ASC' };
}

type SortValue = string | number | null | undefined;

function compare(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

/**
 * Client-side sorting for tables that load every row. `pinnedLast` rows (e.g. a TOTAL row)
 * always stay at the end regardless of direction.
 */
export function useClientSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => SortValue>,
  pinnedLast?: (row: T) => boolean,
) {
  const [sort, setSort] = useState<SortState>({});

  const sorted = useMemo(() => {
    const get = sort.sortBy ? accessors[sort.sortBy] : undefined;
    if (!get) return rows;
    const pinned = pinnedLast ? rows.filter(pinnedLast) : [];
    const body = pinnedLast ? rows.filter((row) => !pinnedLast(row)) : rows;
    const sign = sort.sortOrder === 'DESC' ? -1 : 1;
    return [...body].sort((a, b) => sign * compare(get(a), get(b))).concat(pinned);
    // accessors/pinnedLast are static per table; only data and sort drive the memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return { sorted, ...sort, onSort: (field: string) => setSort((s) => nextSort(s, field)) };
}

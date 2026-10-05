import type { ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { SortOrder } from '@erp/shared-types';
import { cn } from '@/lib/utils';

interface SortableThProps<TField extends string> extends Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'onClick'
> {
  field: TField;
  sortBy?: TField;
  sortOrder?: SortOrder;
  onSort: (field: TField) => void;
  /** Right-align (numeric/money columns). */
  right?: boolean;
}

/** Column header with an asc/desc sort toggle. Use a plain <th> for non-sortable columns. */
export function SortableTh<TField extends string>({
  field,
  sortBy,
  sortOrder,
  onSort,
  right,
  className,
  children,
  ...props
}: SortableThProps<TField>) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortOrder === 'DESC' ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={!active ? 'none' : sortOrder === 'DESC' ? 'descending' : 'ascending'}
      className={cn(className, right && 'text-right')}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 rounded font-[inherit] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          right && 'flex-row-reverse',
          active && 'text-slate-900',
        )}
      >
        {children}
        <Icon
          aria-hidden="true"
          className={cn('h-3 w-3 shrink-0', active ? 'opacity-100' : 'opacity-40')}
        />
      </button>
    </th>
  );
}

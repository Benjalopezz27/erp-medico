import { TaxCondition } from '@erp/shared-types';

interface SupplierTaxConditionBadgeProps {
  taxCondition: TaxCondition;
}

const TAX_CONDITION_LABELS: Record<TaxCondition, string> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]: 'Resp. Inscripto',
  [TaxCondition.MONOTRIBUTO]: 'Monotributo',
  [TaxCondition.EXENTO]: 'Exento',
  [TaxCondition.CONSUMIDOR_FINAL]: 'Cons. Final',
};

const TAX_CONDITION_COLORS: Record<TaxCondition, string> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]:
    'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  [TaxCondition.MONOTRIBUTO]:
    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  [TaxCondition.EXENTO]: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  [TaxCondition.CONSUMIDOR_FINAL]:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function SupplierTaxConditionBadge({ taxCondition }: SupplierTaxConditionBadgeProps) {
  const label = TAX_CONDITION_LABELS[taxCondition] || taxCondition;
  const colorClass =
    TAX_CONDITION_COLORS[taxCondition] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

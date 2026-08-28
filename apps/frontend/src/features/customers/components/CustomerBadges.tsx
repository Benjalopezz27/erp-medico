import { Badge } from '@/components/ui/badge';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import { formatCustomerDocument } from '../utils/customer-document.utils';

const taxLabels: Record<TaxCondition, string> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]: 'Responsable Inscripto',
  [TaxCondition.MONOTRIBUTO]: 'Monotributo',
  [TaxCondition.EXENTO]: 'Exento',
  [TaxCondition.CONSUMIDOR_FINAL]: 'Consumidor Final',
};

export function CustomerStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
  );
}

export function CustomerTaxConditionBadge({ value }: { value: TaxCondition }) {
  return <Badge variant="outline">{taxLabels[value]}</Badge>;
}

export function CustomerDocumentBadge({
  type,
  value,
}: {
  type: CustomerDocumentType;
  value: string;
}) {
  return (
    <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
      {type} {formatCustomerDocument(type, value)}
    </span>
  );
}

export function taxConditionLabel(value: TaxCondition): string {
  return taxLabels[value];
}

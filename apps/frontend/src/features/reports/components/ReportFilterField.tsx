import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { useCustomersQuery } from '@/features/customers/hooks/use-customers-query';
import { useProductsQuery } from '@/features/products/hooks/use-products-query';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import type { ReportFilterDef } from '../report-configs';

type Option = [value: string, label: string];
interface Props {
  def: ReportFilterDef;
  value: string;
  onChange: (value: string) => void;
}

function OptionsSelect({ def, value, onChange, options }: Props & { options: Option[] }) {
  return (
    <Select aria-label={def.label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Todos</option>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );
}

// ponytail: los selects de entidad traen hasta 100 registros (máximo de la API); agregar búsqueda si hay más.
function CustomerSelect(props: Props) {
  const { data } = useCustomersQuery({ page: 1, limit: 100 });
  return (
    <OptionsSelect {...props} options={(data?.data ?? []).map((c) => [c.id, c.businessName])} />
  );
}
function SupplierSelect(props: Props) {
  const { data } = useSuppliersQuery({ page: 1, limit: 100 });
  return (
    <OptionsSelect {...props} options={(data?.data ?? []).map((s) => [s.id, s.businessName])} />
  );
}
function CategorySelect(props: Props) {
  const { data } = useCategoriesQuery();
  return <OptionsSelect {...props} options={(data ?? []).map((c) => [c.id, c.name])} />;
}
function ProductSelect(props: Props) {
  const { data } = useProductsQuery({ page: 1, limit: 100 });
  return <OptionsSelect {...props} options={(data?.items ?? []).map((p) => [p.id, p.name])} />;
}

const ENTITY_SELECTS = {
  customer: CustomerSelect,
  supplier: SupplierSelect,
  category: CategorySelect,
  product: ProductSelect,
};

export function ReportFilterField(props: Props) {
  const { def, value, onChange } = props;
  let control;
  if (def.kind === 'date') {
    control = (
      <Input
        type="date"
        aria-label={def.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else if (def.kind === 'checkbox') {
    control = (
      <input
        type="checkbox"
        aria-label={def.label}
        checked={value === 'true'}
        onChange={(e) => onChange(e.target.checked ? 'true' : '')}
      />
    );
  } else if (def.kind === 'select') {
    control = <OptionsSelect {...props} options={def.options} />;
  } else {
    const EntitySelect = ENTITY_SELECTS[def.entity];
    control = <EntitySelect {...props} />;
  }
  return (
    <div className="space-y-1 text-xs font-semibold">
      {def.label}
      {control}
    </div>
  );
}

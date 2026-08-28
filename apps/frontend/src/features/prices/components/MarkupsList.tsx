import { MarkupLevel } from '@erp/shared-types';
import { Edit3, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IMarkupConfiguration } from '../types/markups.types';
import { markupExample } from '../utils/markups.validation';

interface MarkupsListProps {
  configurations: IMarkupConfiguration[];
  onCreate: (level: MarkupLevel) => void;
  onEdit: (configuration: IMarkupConfiguration) => void;
  onDelete: (configuration: IMarkupConfiguration) => void;
}

function RuleCard({
  rule,
  global = false,
  onEdit,
  onDelete,
}: {
  rule: IMarkupConfiguration;
  global?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const target = rule.categoryName ?? rule.productName ?? 'Base para todo el catálogo';
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{target}</h3>
            {global && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                OBLIGATORIO
              </span>
            )}
          </div>
          {rule.productCode && (
            <p className="mt-0.5 font-mono text-xs text-slate-500">{rule.productCode}</p>
          )}
          <p className="mt-2 text-sm text-slate-600">
            Markup: <strong className="font-mono text-slate-900">{rule.percentage}%</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ejemplo ilustrativo: un costo neto de $100 aplicaría un sugerido de $
            {markupExample(rule.percentage)}. El simulador muestra el resultado autoritativo.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            aria-label={`Editar markup de ${target}`}
          >
            <Edit3 className="mr-1.5 h-4 w-4" /> Editar
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              aria-label={`Eliminar markup de ${target}`}
            >
              <Trash2 className="mr-1.5 h-4 w-4 text-rose-600" /> Eliminar
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ExceptionSection({
  title,
  description,
  level,
  rows,
  onCreate,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  level: MarkupLevel;
  rows: IMarkupConfiguration[];
  onCreate: (level: MarkupLevel) => void;
  onEdit: (rule: IMarkupConfiguration) => void;
  onDelete: (rule: IMarkupConfiguration) => void;
}) {
  return (
    <section aria-labelledby={`markup-${level.toLowerCase()}-title`} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id={`markup-${level.toLowerCase()}-title`}
            className="text-base font-semibold text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <Button size="sm" onClick={() => onCreate(level)}>
          <Plus className="mr-1.5 h-4 w-4" /> Nueva excepción
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No hay excepciones configuradas en este nivel. Se utilizará el siguiente nivel de la
          jerarquía.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <RuleCard
              key={row.id}
              rule={row}
              onEdit={() => onEdit(row)}
              onDelete={() => onDelete(row)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function MarkupsList({ configurations, onCreate, onEdit, onDelete }: MarkupsListProps) {
  const global = configurations.find((row) => row.level === MarkupLevel.GLOBAL);
  const categories = configurations.filter((row) => row.level === MarkupLevel.CATEGORY);
  const products = configurations.filter((row) => row.level === MarkupLevel.PRODUCT);
  return (
    <div className="space-y-7">
      <section aria-labelledby="markup-global-title" className="space-y-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />
          <div>
            <h2 id="markup-global-title" className="text-base font-semibold text-slate-900">
              Markup global
            </h2>
            <p className="text-xs text-slate-500">
              Base obligatoria aplicada cuando no existe una excepción más específica.
            </p>
          </div>
        </div>
        {global ? (
          <RuleCard rule={global} global onEdit={() => onEdit(global)} />
        ) : (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            No existe la configuración global obligatoria. Contacte a soporte.
          </div>
        )}
      </section>
      <ExceptionSection
        title="Excepciones por categoría"
        description="Se aplican a los productos de la categoría que no tengan una excepción propia."
        level={MarkupLevel.CATEGORY}
        rows={categories}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <ExceptionSection
        title="Excepciones por producto"
        description="Tienen la máxima prioridad dentro de la jerarquía."
        level={MarkupLevel.PRODUCT}
        rows={products}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

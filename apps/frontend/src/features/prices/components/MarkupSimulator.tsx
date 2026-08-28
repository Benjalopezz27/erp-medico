import { useState } from 'react';
import { AlertCircle, Calculator, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import type { IProductSummary } from '@/features/products/types/products.types';
import { useMarkupSimulationQuery } from '../hooks/use-markups-query';
import { parseMarkupError } from '../utils/markups.errors';

const levelLabel: Record<string, string> = {
  PRODUCT: 'Producto',
  CATEGORY: 'Categoría',
  GLOBAL: 'Global',
};

export function MarkupSimulator() {
  const [product, setProduct] = useState<IProductSummary | null>(null);
  const query = useMarkupSimulationQuery(product?.id);
  return (
    <section
      aria-labelledby="markup-simulator-title"
      className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <h2 id="markup-simulator-title" className="font-semibold text-slate-900">
            Simulador autoritativo
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Seleccione un producto para consultar su costo actual, el nivel efectivo y el precio
            neto sugerido calculado por el backend.
          </p>
        </div>
      </div>
      <div className="max-w-xl">
        <ProductSearchInput
          value={product}
          onSelect={setProduct}
          ariaLabel="Producto para simular markup"
        />
      </div>
      {query.isFetching && product && (
        <div
          aria-label="Calculando precio sugerido"
          className="h-24 animate-pulse rounded-lg bg-blue-100/70"
        />
      )}
      {query.isError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {parseMarkupError(query.error).message}
          </div>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => query.refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
          </Button>
        </div>
      )}
      {query.data && !query.isFetching && (
        <div
          aria-live="polite"
          className="grid gap-3 rounded-lg border border-blue-200 bg-white p-4 sm:grid-cols-3"
        >
          <div>
            <span className="block text-[11px] font-semibold uppercase text-slate-500">
              Costo neto actual
            </span>
            <strong className="font-mono text-slate-900">$ {query.data.costNet}</strong>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase text-slate-500">
              Markup efectivo
            </span>
            <strong className="font-mono text-slate-900">
              {query.data.effectiveMarkup.percentage}%
            </strong>
            <span className="block text-xs text-slate-500">
              {levelLabel[query.data.effectiveMarkup.level]} ·{' '}
              {query.data.effectiveMarkup.targetName}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase text-slate-500">
              Precio neto sugerido
            </span>
            <strong className="font-mono text-blue-800">$ {query.data.suggestedPriceNet}</strong>
          </div>
        </div>
      )}
      <p className="text-xs font-medium text-blue-900">
        Esta simulación nunca edita ni aplica automáticamente el precio activo de venta.
      </p>
    </section>
  );
}

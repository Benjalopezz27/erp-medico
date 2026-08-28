import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { PriceReviewStatus } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import type { IProductSummary } from '@/features/products/types/products.types';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import type { PriceReviewSearchParams } from '../types/price-reviews.types';

const tabs: Array<{ status: PriceReviewStatus; label: string }> = [
  { status: PriceReviewStatus.PENDIENTE, label: 'Pendientes' },
  { status: PriceReviewStatus.APROBADO, label: 'Aprobadas' },
  { status: PriceReviewStatus.RECHAZADO, label: 'Rechazadas' },
  { status: PriceReviewStatus.POSPUESTO, label: 'Pospuestas' },
];

export function PriceReviewsFilters({
  filters,
  pendingCount,
  onChange,
  onReset,
}: {
  filters: PriceReviewSearchParams;
  pendingCount?: number;
  onChange: (next: Partial<PriceReviewSearchParams>) => void;
  onReset: () => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<IProductSummary | null>(null);
  const categories = useCategoriesQuery();
  const suppliers = useSuppliersQuery({
    page: 1,
    limit: 100,
    sortBy: 'businessName',
    sortOrder: 'ASC',
  });
  const activeFilters = Boolean(
    filters.productId ||
    filters.categoryId ||
    filters.supplierId ||
    filters.supplierInvoiceId ||
    filters.dateFrom ||
    filters.dateTo,
  );

  useEffect(() => {
    if (!filters.productId) setSelectedProduct(null);
  }, [filters.productId]);

  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    onChange({ status: tabs[next].status });
    document.getElementById(`price-review-tab-${tabs[next].status}`)?.focus();
  };

  return (
    <section className="space-y-4" aria-label="Filtros de revisiones de precio">
      <div
        role="tablist"
        aria-label="Estado de la revisión"
        className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
      >
        {tabs.map((tab, index) => {
          const selected = filters.status === tab.status;
          return (
            <button
              key={tab.status}
              id={`price-review-tab-${tab.status}`}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) => moveTab(event, index)}
              onClick={() => onChange({ status: tab.status })}
              className={`min-w-max flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                selected ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {tab.status === PriceReviewStatus.PENDIENTE && pendingCount !== undefined && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Producto</label>
            <ProductSearchInput
              value={selectedProduct}
              onSelect={(product) => {
                setSelectedProduct(product);
                onChange({ productId: product?.id });
              }}
              placeholder="Buscar producto por código o nombre"
              ariaLabel="Filtrar revisiones por producto"
            />
            {filters.productId && (
              <p className="mt-1 text-[10px] text-slate-500">
                Filtro activo: {filters.productId.slice(0, 8)}…
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="price-review-category"
              className="mb-1 block text-[11px] font-semibold text-slate-600"
            >
              Categoría
            </label>
            <Select
              id="price-review-category"
              value={filters.categoryId ?? ''}
              onChange={(event) => onChange({ categoryId: event.target.value || undefined })}
            >
              <option value="">Todas las categorías</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              htmlFor="price-review-supplier"
              className="mb-1 block text-[11px] font-semibold text-slate-600"
            >
              Proveedor
            </label>
            <Select
              id="price-review-supplier"
              value={filters.supplierId ?? ''}
              onChange={(event) => onChange({ supplierId: event.target.value || undefined })}
            >
              <option value="">Todos los proveedores</option>
              {suppliers.data?.data.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.businessName}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <div>
            <label
              htmlFor="price-review-date-from"
              className="mb-1 block text-[11px] font-semibold text-slate-600"
            >
              Factura desde
            </label>
            <Input
              id="price-review-date-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
              className="w-40"
            />
          </div>
          <div>
            <label
              htmlFor="price-review-date-to"
              className="mb-1 block text-[11px] font-semibold text-slate-600"
            >
              Factura hasta
            </label>
            <Input
              id="price-review-date-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
              className="w-40"
            />
          </div>
          {filters.supplierInvoiceId && (
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
              Factura seleccionada: {filters.supplierInvoiceId.slice(0, 8)}…
            </span>
          )}
          {activeFilters && (
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

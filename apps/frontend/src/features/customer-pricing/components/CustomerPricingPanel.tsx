import { useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { CustomerSpecialPriceMode, type ICustomerSpecialPrice } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ICustomer } from '@/features/customers/types/customers.types';
import { formatCurrency } from '@/features/products/utils/products.math';
import {
  useCustomerSpecialPriceProductIdsQuery,
  useCustomerSpecialPricesQuery,
} from '../hooks/use-customer-pricing-query';
import { parseCustomerPricingError } from '../utils/customer-pricing.errors';
import { CustomerGeneralDiscountModal } from './CustomerGeneralDiscountModal';
import { CustomerSpecialPriceDeleteModal } from './CustomerSpecialPriceDeleteModal';
import { CustomerSpecialPriceFormModal } from './CustomerSpecialPriceFormModal';

export function CustomerPricingPanel({
  customer,
  canManage,
}: {
  customer: ICustomer;
  canManage: boolean;
}) {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ICustomerSpecialPrice | null>(null);
  const [deletingRule, setDeletingRule] = useState<ICustomerSpecialPrice | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const query = useCustomerSpecialPricesQuery(customer.id, { page, limit: 10, search });
  const productIdsQuery = useCustomerSpecialPriceProductIdsQuery(customer.id, canManage);
  const rules = query.data?.data ?? [];
  const excludedProductIds = productIdsQuery.data ?? rules.map((rule) => rule.productId);
  const writeEnabled = canManage && customer.isActive;
  const refresh = () => void query.refetch();
  const success = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(undefined), 6000);
  };

  return (
    <div className="space-y-4">
      {!customer.isActive && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          Cliente inactivo: las condiciones comerciales se muestran en modo solo lectura.
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">Descuento general</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Fallback para productos sin excepción.</p>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!customer.isActive}
                onClick={() => setDiscountOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Modificar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {customer.generalDiscountPercentage}%
            </p>
            <p className="mt-2 text-xs text-slate-500">
              No altera los precios activos del catálogo.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-blue-600" />
              Jerarquía de resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol
              className="grid gap-2 text-xs sm:grid-cols-4"
              aria-label="Prioridad de reglas de precio"
            >
              {[
                '1. Precio fijo',
                '2. Descuento por producto',
                '3. Descuento general',
                '4. Catálogo activo',
              ].map((label) => (
                <li
                  key={label}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-medium"
                >
                  {label}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Se aplica la primera regla disponible. El backend determina y devuelve el resultado
              final.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-sm">Excepciones por producto</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Catálogo y resultado final se muestran juntos.
            </p>
          </div>
          {canManage && (
            <Button
              type="button"
              size="sm"
              disabled={!customer.isActive}
              onClick={() => {
                setEditingRule(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva excepción
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <form
            className="flex gap-2 border-t border-slate-100 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchDraft.trim());
            }}
          >
            <Input
              aria-label="Buscar excepciones"
              placeholder="Buscar por código o producto"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <Button type="submit" variant="outline" size="sm">
              <Search className="mr-1.5 h-4 w-4" />
              Buscar
            </Button>
          </form>
          {query.isPending ? (
            <div aria-label="Cargando precios especiales" className="space-y-2 border-t p-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : query.isError ? (
            <div
              role="alert"
              className="m-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700"
            >
              <AlertCircle className="mx-auto mb-2 h-6 w-6" />
              <p>{parseCustomerPricingError(query.error).message}</p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refresh}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          ) : rules.length === 0 ? (
            <div className="border-t p-8 text-center text-xs text-slate-500">
              <Tag className="mx-auto mb-2 h-7 w-7 text-slate-400" />
              <p className="font-semibold text-slate-800">
                {search
                  ? 'No hay excepciones que coincidan con la búsqueda.'
                  : 'Este cliente no posee excepciones por producto.'}
              </p>
              <p className="mt-1">Aplica el descuento general o el precio activo de catálogo.</p>
              {writeEnabled && !search && (
                <Button type="button" size="sm" className="mt-3" onClick={() => setFormOpen(true)}>
                  Agregar primera excepción
                </Button>
              )}
            </div>
          ) : (
            <div className={`overflow-x-auto border-t ${query.isFetching ? 'opacity-70' : ''}`}>
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Catálogo activo
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Regla aplicada
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Valor
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Precio final
                    </th>
                    {canManage && (
                      <th scope="col" className="px-4 py-3 text-right">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold">{rule.productCode}</span>
                        <p className="mt-0.5 font-medium text-slate-900">{rule.productName}</p>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatCurrency(rule.activeCatalogPriceNet)}
                      </td>
                      <td className="px-4 py-3">
                        {rule.mode === CustomerSpecialPriceMode.FIXED_PRICE
                          ? 'Precio fijo'
                          : 'Descuento por producto'}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {rule.mode === CustomerSpecialPriceMode.FIXED_PRICE
                          ? formatCurrency(rule.specialPriceNet ?? '0')
                          : `${rule.discountPercentage}%`}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                        {formatCurrency(rule.finalPriceNet)}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!customer.isActive}
                              aria-label={`Editar precio especial para ${rule.productName}`}
                              onClick={() => {
                                setEditingRule(rule);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!customer.isActive}
                              aria-label={`Eliminar precio especial para ${rule.productName}`}
                              onClick={() => setDeletingRule(rule)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {query.data && query.data.meta.totalPages > 0 && (
            <nav
              aria-label="Paginación de precios especiales"
              className="flex items-center justify-between border-t p-3 text-xs"
            >
              <span>
                {query.data.meta.total} excepción{query.data.meta.total === 1 ? '' : 'es'} · Página{' '}
                {query.data.meta.page} de {query.data.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Página anterior"
                  disabled={!query.data.meta.hasPreviousPage || query.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Página siguiente"
                  disabled={!query.data.meta.hasNextPage || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>

      <CustomerSpecialPriceFormModal
        customerId={customer.id}
        rule={editingRule}
        isOpen={formOpen}
        excludeProductIds={excludedProductIds}
        onClose={() => {
          setFormOpen(false);
          setEditingRule(null);
        }}
        onSuccess={success}
        onRefresh={refresh}
      />
      <CustomerSpecialPriceDeleteModal
        customerId={customer.id}
        rule={deletingRule}
        generalDiscountPercentage={customer.generalDiscountPercentage}
        onClose={() => setDeletingRule(null)}
        onSuccess={success}
        onRefresh={refresh}
      />
      <CustomerGeneralDiscountModal
        customer={customer}
        isOpen={discountOpen}
        onClose={() => setDiscountOpen(false)}
        onSuccess={success}
      />
    </div>
  );
}

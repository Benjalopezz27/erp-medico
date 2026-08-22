import React from 'react';
import { Edit, Trash2, RotateCcw, Package, Loader2 } from 'lucide-react';
import { ProductStatus } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDecimal } from '../utils/products.math';
import { isProductAdminView, type ProductListItem } from '../types/products.types';

interface ProductsTableProps {
  products: ProductListItem[];
  isLoading: boolean;
  isFetching?: boolean;
  isAdmin: boolean;
  onEdit: (productId: string) => void;
  onDeactivate: (product: ProductListItem) => void;
  onReactivate: (product: ProductListItem) => void;
  mutatingProductId?: string | null;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading,
  isFetching = false,
  isAdmin,
  onEdit,
  onDeactivate,
  onReactivate,
  mutatingProductId,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Cargando catálogo de productos...</span>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center">
        <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No se encontraron productos</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          No hay productos que coincidan con los filtros seleccionados o el catálogo está vacío.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-t-xl border border-slate-200 shadow-sm overflow-x-auto relative">
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[0.5px] flex items-center justify-center z-10">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        </div>
      )}

      <table className="w-full text-left text-xs text-slate-600 border-collapse">
        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
          <tr>
            <th scope="col" className="py-3 px-4">
              Código
            </th>
            <th scope="col" className="py-3 px-4">
              Nombre
            </th>
            <th scope="col" className="py-3 px-4">
              Categoría
            </th>
            <th scope="col" className="py-3 px-4">
              Unidad Base
            </th>
            <th scope="col" className="py-3 px-4 text-right">
              Precio Activo
            </th>
            <th scope="col" className="py-3 px-4 text-center">
              Estado
            </th>
            {isAdmin && (
              <>
                <th scope="col" className="py-3 px-4 text-right">
                  Costo Neto
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Markup
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Acciones
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => {
            const isActive = product.status === ProductStatus.ACTIVE;
            const isMutating = mutatingProductId === product.id;
            const adminProduct = isProductAdminView(product) ? product : null;

            return (
              <tr key={product.id} className="hover:bg-slate-50/75 transition-colors group">
                {/* Code */}
                <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                    {product.internalCode}
                  </span>
                </td>

                {/* Name & Description */}
                <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                  <div className="truncate font-semibold">{product.name}</div>
                  {product.description && (
                    <div className="text-[11px] text-slate-400 truncate">{product.description}</div>
                  )}
                </td>

                {/* Category */}
                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                  {product.category?.name || '—'}
                </td>

                {/* Base Unit */}
                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                  {product.baseUnit ? (
                    <span>
                      {product.baseUnit.name}{' '}
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({product.baseUnit.symbol})
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>

                {/* Active Price */}
                <td className="py-3 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                  {formatCurrency(product.activePriceNet)}
                </td>

                {/* Status */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <Badge
                    variant={isActive ? 'success' : 'secondary'}
                    className="text-[10px] font-semibold uppercase tracking-wider"
                  >
                    {isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>

                {/* Admin Columns */}
                {isAdmin && (
                  <>
                    <td className="py-3 px-4 text-right text-slate-600 font-mono whitespace-nowrap">
                      {adminProduct ? formatCurrency(adminProduct.costNet) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                      {adminProduct &&
                      adminProduct.markupPercentage !== null &&
                      adminProduct.markupPercentage !== undefined
                        ? `${formatDecimal(adminProduct.markupPercentage, 2)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(product.id)}
                          aria-label={`Editar ${product.name}`}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivate(product)}
                            aria-label={`Desactivar ${product.name}`}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onReactivate(product)}
                            disabled={isMutating}
                            aria-label={`Reactivar ${product.name}`}
                            className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1"
                          >
                            {isMutating ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            <span>Reactivar</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

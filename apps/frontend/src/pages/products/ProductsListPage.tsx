import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Package, AlertCircle, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ProductFilters } from '@/features/products/components/ProductFilters';
import { ProductsTable } from '@/features/products/components/ProductsTable';
import { ProductPagination } from '@/features/products/components/ProductPagination';
import { ProductDeactivateModal } from '@/features/products/components/ProductDeactivateModal';
import { useProductsQuery } from '@/features/products/hooks/use-products-query';
import {
  useDeactivateProductMutation,
  useReactivateProductMutation,
} from '@/features/products/hooks/use-product-mutations';
import { parseProductApiError } from '@/features/products/utils/products.errors';
import type {
  ProductListItem,
  ProductSearchParams,
} from '@/features/products/types/products.types';

export const ProductsListPage: React.FC = () => {
  const navigate = useNavigate({ from: '/products' });
  const searchParams = useSearch({ strict: false }) as ProductSearchParams;
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMINISTRADOR;

  // Modals & Mutation state
  const [deactivateModalProduct, setDeactivateModalProduct] = useState<ProductListItem | null>(
    null,
  );
  const [mutatingProductId, setMutatingProductId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Queries & Mutations
  const { data, isPending, isFetching, isError, error, isPlaceholderData, refetch } =
    useProductsQuery(searchParams);

  const deactivateMutation = useDeactivateProductMutation();
  const reactivateMutation = useReactivateProductMutation();

  // Out-of-bounds page correction after fresh data arrives
  useEffect(() => {
    if (data && !isPlaceholderData && data.meta.totalPages > 0) {
      if (searchParams.page > data.meta.totalPages) {
        navigate({
          to: '/products',
          search: () => ({
            page: data.meta.totalPages,
            limit: searchParams.limit,
            status: searchParams.status,
          }),
          replace: true,
        });
      }
    }
  }, [
    data,
    isPlaceholderData,
    searchParams.page,
    searchParams.limit,
    searchParams.status,
    navigate,
  ]);

  // Handle cross-navigation notice from URL search params
  useEffect(() => {
    if (searchParams.notice) {
      const noticeMessages: Record<string, string> = {
        created: 'Producto creado exitosamente.',
        updated: 'Producto actualizado exitosamente.',
        deactivated: 'Producto desactivado exitosamente.',
        reactivated: 'Producto reactivado exitosamente.',
      };

      const msg = noticeMessages[searchParams.notice] || 'Operación completada exitosamente.';
      setFeedbackNotice({ type: 'success', message: msg });

      // Clean the notice from URL
      navigate({
        to: '/products',
        search: () => ({
          page: searchParams.page,
          limit: searchParams.limit,
          status: searchParams.status,
        }),
        replace: true,
      });
    }
  }, [searchParams.notice, searchParams.page, searchParams.limit, searchParams.status, navigate]);

  // URL Search Updater Helper
  const updateSearch = (updater: (prev: ProductSearchParams) => Partial<ProductSearchParams>) => {
    navigate({
      to: '/products',
      search: (prev) => {
        const current = prev as ProductSearchParams;
        return {
          page: current.page,
          limit: current.limit,
          status: current.status,
          ...updater(current),
        };
      },
    });
  };

  const handleStatusChange = (status?: ProductSearchParams['status']) => {
    updateSearch(() => ({ status, page: 1 }));
  };

  const handleResetFilters = () => {
    navigate({
      to: '/products',
      search: () => ({
        page: 1,
        limit: searchParams.limit || 10,
      }),
    });
  };

  const handlePageChange = (newPage: number) => {
    updateSearch(() => ({ page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    updateSearch(() => ({ limit: newLimit, page: 1 }));
  };

  // Actions
  const handleOpenCreatePage = () => {
    navigate({ to: '/products/new' });
  };

  const handleOpenEditPage = (productId: string) => {
    navigate({ to: '/products/$id/edit', params: { id: productId } });
  };

  const handleOpenDeactivateModal = (product: ProductListItem) => {
    setDeactivateModalProduct(product);
  };

  const handleConfirmDeactivate = async (product: ProductListItem) => {
    await deactivateMutation.mutateAsync(product.id);
  };

  const handleReactivate = async (product: ProductListItem) => {
    setMutatingProductId(product.id);
    try {
      await reactivateMutation.mutateAsync(product.id);
      setFeedbackNotice({
        type: 'success',
        message: `El producto "${product.name}" (${product.internalCode}) fue reactivado exitosamente.`,
      });
    } catch (err) {
      setFeedbackNotice({ type: 'error', message: parseProductApiError(err) });
    } finally {
      setMutatingProductId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Catálogo de Productos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión de catálogo, precios, unidades base y factores de conversión
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button
            type="button"
            onClick={handleOpenCreatePage}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </Button>
        )}
      </div>

      {/* Global Success Feedback Banner */}
      {feedbackNotice && (
        <div
          role="alert"
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/60 rounded"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Query Error State Banner */}
      {isError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">No se pudieron cargar los productos</p>
              <p className="mt-0.5">{parseProductApiError(error)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="bg-white border-red-300 text-red-700 hover:bg-red-50 text-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <ProductFilters
        status={searchParams.status}
        onStatusChange={handleStatusChange}
        onResetFilters={handleResetFilters}
      />

      {/* Product Table & Pagination */}
      <div className="space-y-0">
        <ProductsTable
          products={data?.items || []}
          isLoading={isPending}
          isFetching={isFetching && !isPending}
          isAdmin={isAdmin}
          onEdit={handleOpenEditPage}
          onDeactivate={handleOpenDeactivateModal}
          onReactivate={handleReactivate}
          mutatingProductId={mutatingProductId}
        />

        {data && data.meta && data.items.length > 0 && (
          <ProductPagination
            meta={data.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            disabled={isFetching}
          />
        )}
      </div>

      {/* Deactivate Confirmation Modal */}
      <ProductDeactivateModal
        isOpen={Boolean(deactivateModalProduct)}
        onClose={() => setDeactivateModalProduct(null)}
        product={deactivateModalProduct}
        onConfirm={handleConfirmDeactivate}
        onSuccessNotice={(msg) => setFeedbackNotice({ type: 'success', message: msg })}
      />
    </div>
  );
};

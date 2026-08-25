import React, { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  ArrowLeft,
  Plus,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCuit } from '@erp/shared-types';
import { useQuery } from '@tanstack/react-query';
import { getSupplierByIdApi } from '@/features/suppliers/api/suppliers.api';
import { supplierKeys } from '@/features/suppliers/hooks/suppliers-keys';
import { SupplierStatusBadge } from '@/features/suppliers/components/SupplierStatusBadge';
import { SupplierTaxConditionBadge } from '@/features/suppliers/components/SupplierTaxConditionBadge';
import { SupplierProductTable } from '@/features/supplier-products/components/SupplierProductTable';
import { SupplierProductFilters } from '@/features/supplier-products/components/SupplierProductFilters';
import { SupplierProductPagination } from '@/features/supplier-products/components/SupplierProductPagination';
import { SupplierProductFormModal } from '@/features/supplier-products/components/SupplierProductFormModal';
import { SupplierProductDeleteModal } from '@/features/supplier-products/components/SupplierProductDeleteModal';
import { useSupplierProductsQuery } from '@/features/supplier-products/hooks/use-supplier-products-query';
import {
  useCreateSupplierProductMutation,
  useUpdateSupplierProductMutation,
  useDeleteSupplierProductMutation,
} from '@/features/supplier-products/hooks/use-supplier-product-mutations';
import { parseSupplierProductApiError } from '@/features/supplier-products/utils/supplier-products.errors';
import type {
  ISupplierProduct,
  ISupplierProductSearchParams,
  CreateSupplierProductPayload,
  UpdateSupplierProductPayload,
} from '@/features/supplier-products/types/supplier-products.types';
import type { SupplierProductFormData } from '@/features/supplier-products/schemas/supplier-product.schema';

export const SupplierCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { supplierId?: string };
  const supplierId = params.supplierId || '';

  const searchParams = useSearch({
    strict: false,
  }) as ISupplierProductSearchParams;

  const currentFilters: ISupplierProductSearchParams = {
    page: Number(searchParams?.page) || 1,
    limit: Number(searchParams?.limit) || 10,
    search: searchParams?.search || undefined,
    sortBy: searchParams?.sortBy || 'createdAt',
    sortOrder: searchParams?.sortOrder || 'DESC',
  };

  // State for Modals and Feedback
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    supplierProduct: ISupplierProduct | null;
  }>({
    isOpen: false,
    mode: 'create',
    supplierProduct: null,
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    supplierProduct: ISupplierProduct | null;
  }>({
    isOpen: false,
    supplierProduct: null,
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Queries
  const {
    data: supplier,
    isLoading: isLoadingSupplier,
    isError: isErrorSupplier,
  } = useQuery({
    queryKey: supplierKeys.detail(supplierId),
    queryFn: () => getSupplierByIdApi(supplierId),
    enabled: Boolean(supplierId),
  });

  const {
    data: catalogData,
    isLoading: isLoadingCatalog,
    isFetching: isFetchingCatalog,
    isError: isErrorCatalog,
    refetch: refetchCatalog,
  } = useSupplierProductsQuery(supplierId, currentFilters);

  // Mutations
  const createMutation = useCreateSupplierProductMutation(supplierId);
  const updateMutation = useUpdateSupplierProductMutation(
    supplierId,
    formModal.supplierProduct?.id || '',
  );
  const deleteMutation = useDeleteSupplierProductMutation(supplierId);

  // URL Query Sync
  const updateSearch = (
    updater: (prev: ISupplierProductSearchParams) => Partial<ISupplierProductSearchParams>,
  ) => {
    navigate({
      to: '/suppliers/$supplierId/catalog',
      params: { supplierId },
      search: () => ({
        ...currentFilters,
        ...updater(currentFilters),
      }),
    });
  };

  const handleSearchChange = (search?: string) => {
    updateSearch(() => ({ search, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    updateSearch(() => ({ page: newPage }));
  };

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setModalError(null);
    setFormModal({
      isOpen: true,
      mode: 'create',
      supplierProduct: null,
    });
  };

  const handleOpenEditModal = (item: ISupplierProduct) => {
    setModalError(null);
    setFormModal({
      isOpen: true,
      mode: 'edit',
      supplierProduct: item,
    });
  };

  const handleCloseFormModal = () => {
    setFormModal((prev) => ({ ...prev, isOpen: false }));
    setModalError(null);
  };

  const handleOpenDeleteModal = (item: ISupplierProduct) => {
    setDeleteError(null);
    setDeleteModal({
      isOpen: true,
      supplierProduct: item,
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModal((prev) => ({ ...prev, isOpen: false }));
    setDeleteError(null);
  };

  // Submit Create / Edit
  const handleFormSubmit = async (formData: SupplierProductFormData) => {
    setModalError(null);
    setFeedback(null);

    if (formModal.mode === 'create') {
      const payload: CreateSupplierProductPayload = {
        productId: formData.productId,
        supplierExternalCode: formData.supplierExternalCode,
        supplierDescription: formData.supplierDescription || null,
        purchaseUnitId: formData.purchaseUnitId,
        conversionFactorToBase: formData.conversionFactorToBase,
        usualCostNet: formData.usualCostNet ?? null,
        isPrimarySupplier: formData.isPrimarySupplier,
      };

      try {
        await createMutation.mutateAsync(payload);
        handleCloseFormModal();
        setFeedback({
          type: 'success',
          message: `Producto asociado exitosamente con SKU "${formData.supplierExternalCode}".`,
        });
      } catch (err) {
        const parsed = parseSupplierProductApiError(err);
        setModalError(parsed.message);
      }
    } else if (formModal.mode === 'edit' && formModal.supplierProduct) {
      const payload: UpdateSupplierProductPayload = {
        supplierExternalCode: formData.supplierExternalCode,
        supplierDescription: formData.supplierDescription || null,
        purchaseUnitId: formData.purchaseUnitId,
        conversionFactorToBase: formData.conversionFactorToBase,
        usualCostNet: formData.usualCostNet ?? null,
        isPrimarySupplier: formData.isPrimarySupplier,
      };

      try {
        await updateMutation.mutateAsync(payload);
        handleCloseFormModal();
        setFeedback({
          type: 'success',
          message: `Asociación de producto actualizada correctamente.`,
        });
      } catch (err) {
        const parsed = parseSupplierProductApiError(err);
        setModalError(parsed.message);
      }
    }
  };

  // Submit Delete
  const handleDeleteConfirm = async () => {
    if (!deleteModal.supplierProduct) return;
    setDeleteError(null);
    setFeedback(null);

    try {
      await deleteMutation.mutateAsync(deleteModal.supplierProduct.id);
      const sku = deleteModal.supplierProduct.supplierExternalCode;
      handleCloseDeleteModal();
      setFeedback({
        type: 'success',
        message: `Asociación con SKU "${sku}" eliminada correctamente del catálogo.`,
      });
    } catch (err) {
      const parsed = parseSupplierProductApiError(err);
      setDeleteError(parsed.message);
    }
  };

  if (isLoadingSupplier) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-slate-500">Cargando datos del proveedor...</p>
      </div>
    );
  }

  if (isErrorSupplier || !supplier) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-center space-y-4 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Proveedor no encontrado
        </h2>
        <p className="text-sm text-slate-500">
          No pudimos localizar la información del proveedor solicitado.
        </p>
        <Button onClick={() => navigate({ to: '/suppliers' })} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Proveedores
        </Button>
      </div>
    );
  }

  const isSupplierActive = supplier.isActive;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb / Return button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/suppliers' })}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Volver al listado de proveedores
        </Button>
      </div>

      {/* Supplier Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Catálogo: {supplier.businessName}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  CUIT: <strong className="font-mono">{formatCuit(supplier.cuit)}</strong>
                </span>
                <span>•</span>
                <SupplierTaxConditionBadge taxCondition={supplier.taxCondition} />
                <span>•</span>
                <SupplierStatusBadge isActive={supplier.isActive} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={!isSupplierActive || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            title={
              !isSupplierActive
                ? 'No se pueden asociar productos a un proveedor inactivo'
                : 'Asociar nuevo producto al catálogo'
            }
          >
            <Plus className="w-4 h-4" />
            Asociar Producto
          </Button>
        </div>
      </div>

      {/* Inactive Supplier Notice */}
      {!isSupplierActive && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Proveedor Inactivo (Modo solo lectura parcial)</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Este proveedor se encuentra inactivo. El catálogo está disponible para consulta
              histórica y eliminación de asociaciones obsoletas, pero no es posible asociar nuevos
              productos ni editar las relaciones actuales.
            </p>
          </div>
        </div>
      )}

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 px-2 text-xs"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* Filters */}
      <SupplierProductFilters
        search={currentFilters.search || ''}
        onSearchChange={handleSearchChange}
        isLoading={isLoadingCatalog || isFetchingCatalog}
      />

      {/* Catalog Table & Pagination */}
      {isErrorCatalog ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800 space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Error al cargar el catálogo de productos del proveedor.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetchCatalog()}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          <SupplierProductTable
            items={catalogData?.data || []}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            isSupplierActive={isSupplierActive}
            isLoading={isLoadingCatalog}
            isMutating={
              createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
            }
          />

          {catalogData?.meta && (
            <SupplierProductPagination
              page={catalogData.meta.page}
              limit={catalogData.meta.limit}
              total={catalogData.meta.total}
              totalPages={catalogData.meta.totalPages}
              onPageChange={handlePageChange}
              isLoading={isLoadingCatalog || isFetchingCatalog}
            />
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <SupplierProductFormModal
        isOpen={formModal.isOpen}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        supplierProduct={formModal.supplierProduct}
        isLoading={createMutation.isPending || updateMutation.isPending}
        errorMessage={modalError}
      />

      {/* Delete Confirmation Modal */}
      <SupplierProductDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        supplierProduct={deleteModal.supplierProduct}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        errorMessage={deleteError}
      />
    </div>
  );
};

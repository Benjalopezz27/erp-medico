import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, Truck, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierFilters } from '@/features/suppliers/components/SupplierFilters';
import { SupplierTable } from '@/features/suppliers/components/SupplierTable';
import { SupplierPagination } from '@/features/suppliers/components/SupplierPagination';
import { SupplierFormModal } from '@/features/suppliers/components/SupplierFormModal';
import { SupplierDeactivateModal } from '@/features/suppliers/components/SupplierDeactivateModal';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import { useReactivateSupplierMutation } from '@/features/suppliers/hooks/use-supplier-mutations';
import { parseSupplierApiError } from '@/features/suppliers/utils/suppliers.errors';
import type { ISupplier, ISupplierSearchParams } from '@/features/suppliers/types/suppliers.types';

export const SuppliersPage: React.FC = () => {
  const navigate = useNavigate({ from: '/suppliers' });
  const searchParams = useSearch({ strict: false }) as ISupplierSearchParams;

  // Modal & Mutation State
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    supplier: ISupplier | null;
  }>({
    isOpen: false,
    mode: 'create',
    supplier: null,
  });

  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    supplier: ISupplier | null;
  }>({
    isOpen: false,
    supplier: null,
  });

  const [mutatingSupplierId, setMutatingSupplierId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Queries & Mutations
  const { data, isPending, isFetching, isError, error, isPlaceholderData, refetch } =
    useSuppliersQuery(searchParams);

  const reactivateMutation = useReactivateSupplierMutation();

  // Out-of-bounds page correction after fresh data arrival
  useEffect(() => {
    if (data && !isPlaceholderData && data.meta.totalPages > 0) {
      if ((searchParams.page ?? 1) > data.meta.totalPages) {
        navigate({
          search: (prev) => ({
            ...prev,
            page: data.meta.totalPages,
          }),
          replace: true,
        });
      }
    }
  }, [data, isPlaceholderData, searchParams.page, navigate]);

  // URL Search Updater Helper
  const updateSearch = (
    updater: (prev: ISupplierSearchParams) => Partial<ISupplierSearchParams>,
  ) => {
    navigate({
      to: '/suppliers',
      search: (prev) => ({
        ...prev,
        ...updater(prev as ISupplierSearchParams),
      }),
    });
  };

  // Filter Handlers (All reset page to 1)
  const handleSearchChange = (search?: string) => {
    updateSearch(() => ({ search, page: 1 }));
  };

  const handleStatusChange = (isActive?: boolean) => {
    updateSearch(() => ({ isActive, page: 1 }));
  };

  const handleResetFilters = () => {
    navigate({
      to: '/suppliers',
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

  // Action Handlers
  const handleOpenCatalog = (supplier: ISupplier) => {
    navigate({
      to: '/suppliers/$supplierId/catalog',
      params: { supplierId: supplier.id },
    });
  };

  const handleOpenCreateModal = () => {
    setFeedback(null);
    setFormModal({ isOpen: true, mode: 'create', supplier: null });
  };

  const handleOpenEditModal = (supplier: ISupplier) => {
    setFeedback(null);
    setFormModal({ isOpen: true, mode: 'edit', supplier });
  };

  const handleOpenDeactivateModal = (supplier: ISupplier) => {
    setFeedback(null);
    setDeactivateModal({ isOpen: true, supplier });
  };

  const handleReactivate = async (supplier: ISupplier) => {
    setFeedback(null);
    setMutatingSupplierId(supplier.id);
    try {
      await reactivateMutation.mutateAsync(supplier.id);
      setFeedback({
        type: 'success',
        message: `El proveedor "${supplier.businessName}" fue reactivado exitosamente.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: parseSupplierApiError(err),
      });
    } finally {
      setMutatingSupplierId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gestión de Proveedores
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administración de proveedores, CUITs fiscales y datos de contacto
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <SupplierFilters
        search={searchParams.search}
        isActive={searchParams.isActive}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onResetFilters={handleResetFilters}
      />

      {/* Main Table / States */}
      {isError ? (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3"
        >
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
              Error al cargar los proveedores
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1 max-w-md mx-auto">
              {parseSupplierApiError(error)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reintentar
          </Button>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No se encontraron proveedores
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchParams.search || searchParams.isActive !== undefined
                ? 'No hay registros que coincidan con los filtros aplicados.'
                : 'Aún no hay proveedores registrados en el catálogo.'}
            </p>
          </div>
          {searchParams.search || searchParams.isActive !== undefined ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Limpiar filtros
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear primer proveedor
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-0 shadow-sm rounded-xl overflow-hidden">
          <SupplierTable
            suppliers={data?.data || []}
            isPending={isPending}
            isFetching={isFetching}
            onEditSupplier={handleOpenEditModal}
            onDeactivateSupplier={handleOpenDeactivateModal}
            onReactivateSupplier={handleReactivate}
            onOpenCatalog={handleOpenCatalog}
            mutatingSupplierId={mutatingSupplierId}
          />
          {data && data.meta && (
            <SupplierPagination
              meta={data.meta}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              disabled={isFetching}
            />
          )}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <SupplierFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialSupplier={formModal.supplier}
        onClose={() => setFormModal({ isOpen: false, mode: 'create', supplier: null })}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message:
              formModal.mode === 'create'
                ? 'Proveedor registrado exitosamente.'
                : 'Proveedor actualizado exitosamente.',
          });
        }}
      />

      {/* Deactivate Confirmation Modal */}
      <SupplierDeactivateModal
        isOpen={deactivateModal.isOpen}
        supplier={deactivateModal.supplier}
        onClose={() => setDeactivateModal({ isOpen: false, supplier: null })}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message: `El proveedor "${deactivateModal.supplier?.businessName}" fue desactivado.`,
          });
        }}
      />
    </div>
  );
};

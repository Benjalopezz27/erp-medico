import React, { useState } from 'react';
import { Link, useParams, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import {
  ArrowLeft,
  Edit3,
  Send,
  Ban,
  Calendar,
  User,
  AlertCircle,
  Clock,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge';
import { EmitPurchaseOrderModal } from '@/features/purchase-orders/components/EmitPurchaseOrderModal';
import { CancelPurchaseOrderModal } from '@/features/purchase-orders/components/CancelPurchaseOrderModal';
import { PurchaseOrderForm } from '@/features/purchase-orders/components/PurchaseOrderForm';
import { GoodsReceiptsHistory } from '@/features/purchase-orders/components/goods-receipts/GoodsReceiptsHistory';
import { usePurchaseOrderDetailQuery } from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import {
  useUpdatePurchaseOrderMutation,
  useEmitPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
} from '@/features/purchase-orders/hooks/use-purchase-order-mutations';
import {
  mapFormToUpdatePayload,
  mapDetailToFormData,
} from '@/features/purchase-orders/schemas/purchase-order.schema';
import {
  formatCurrency,
  formatQuantity,
} from '@/features/purchase-orders/utils/purchase-orders.math';
import { getPurchaseOrderErrorMessage } from '@/features/purchase-orders/utils/purchase-orders.errors';
import {
  PurchaseOrderStatus,
  type IPurchaseOrderFormData,
} from '@/features/purchase-orders/types/purchase-orders.types';

export const PurchaseOrderDetailPage: React.FC = () => {
  const { id } = useParams({ from: '/app/purchases/orders/$id' });
  const navigate = useNavigate();
  const router = useRouter();
  const searchParams = useSearch({ strict: false }) as { edit?: boolean };

  const [isEditing, setIsEditing] = useState(Boolean(searchParams?.edit));
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { data: order, isLoading, isError, error, refetch } = usePurchaseOrderDetailQuery(id);

  const updateMutation = useUpdatePurchaseOrderMutation();
  const emitMutation = useEmitPurchaseOrderMutation();
  const cancelMutation = useCancelPurchaseOrderMutation();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: '/purchases/orders' });
    }
  };

  const handleStartEdit = async () => {
    setGeneralError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setGeneralError(null);
  };

  const handleSaveEdit = async (data: IPurchaseOrderFormData) => {
    setGeneralError(null);
    try {
      const payload = mapFormToUpdatePayload(data);
      await updateMutation.mutateAsync({ id, payload });
      setIsEditing(false);
    } catch (err) {
      setGeneralError(getPurchaseOrderErrorMessage(err));
      refetch();
    }
  };

  const handleEmitConfirm = async () => {
    setGeneralError(null);
    try {
      await emitMutation.mutateAsync(id);
      setIsEmitModalOpen(false);
    } catch (err) {
      setGeneralError(getPurchaseOrderErrorMessage(err));
      refetch();
      setIsEmitModalOpen(false);
    }
  };

  const handleCancelConfirm = async (cancelReason?: string) => {
    setGeneralError(null);
    try {
      await cancelMutation.mutateAsync({ id, payload: { cancelReason } });
      setIsCancelModalOpen(false);
    } catch (err) {
      setGeneralError(getPurchaseOrderErrorMessage(err));
      refetch();
      setIsCancelModalOpen(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Cargando orden de compra...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800 p-12 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            No se pudo cargar la orden de compra
          </h2>
          <p className="text-xs text-slate-500 mt-1">{getPurchaseOrderErrorMessage(error)}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Volver al listado
        </Button>
      </div>
    );
  }

  const isDraft = order.status === PurchaseOrderStatus.BORRADOR;
  const isEmitted = order.status === PurchaseOrderStatus.EMITIDA;
  const isPartial = order.status === PurchaseOrderStatus.PARCIAL;
  const isCancellable = isDraft || isEmitted || isPartial;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-200">
              Inicio
            </Link>
            <span>/</span>
            <button
              type="button"
              onClick={handleBack}
              className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Compras
            </button>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-semibold">
              {order.orderNumber}
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {order.orderNumber}
            </h1>
            <PurchaseOrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Global Page Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="text-xs"
            aria-label="Volver al listado"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Volver al listado
          </Button>

          {!isEditing && isDraft && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Editar Borrador
            </Button>
          )}

          {!isEditing && isDraft && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsEmitModalOpen(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Emitir Orden
            </Button>
          )}

          {!isEditing && isCancellable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              {isPartial ? 'Cancelar Saldo' : 'Cancelar Orden'}
            </Button>
          )}

          {(isEmitted || isPartial) && (
            <Link
              to="/purchases/orders/$id/receive"
              params={{ id: order.id }}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className:
                  'text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800',
              })}
            >
              <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
              Registrar Recepción
            </Link>
          )}
        </div>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Ocurrió un error</p>
            <p className="mt-0.5">{generalError}</p>
          </div>
        </div>
      )}

      {/* Edit Mode vs Read Detail Mode */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200 flex items-center justify-between">
            <span>
              Está editando el borrador <strong>{order.orderNumber}</strong>. Al guardar cambios se
              actualizarán las líneas de la orden.
            </span>
          </div>

          <PurchaseOrderForm
            initialData={mapDetailToFormData(order)}
            currentSupplier={{
              id: order.supplier.id,
              businessName: order.supplier.businessName,
              cuit: order.supplier.cuit,
              isActive: true,
            }}
            onSaveDraft={handleSaveEdit}
            onCancel={handleCancelEdit}
            isSubmitting={updateMutation.isPending}
            showSaveAndEmit={false}
            isEditMode={true}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Proveedor
              </span>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {order.supplier.businessName}
              </p>
              <p className="text-xs text-slate-500 font-mono">CUIT: {order.supplier.cuit}</p>
            </div>

            {/* Dates & Logistics Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Logística y Fechas
              </span>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Entrega esperada:{' '}
                    <strong>{order.expectedDeliveryDate || 'Sin especificar'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Creada: {formatDate(order.createdAt)}</span>
                </div>
                {order.emittedAt && (
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Emitida: {formatDate(order.emittedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audit & Author Card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Usuario Creador
              </span>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {order.user?.name || 'Administrador'}
                  </p>
                  <p className="text-slate-400">{order.user?.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Banner (if cancelled) */}
          {order.status === PurchaseOrderStatus.CANCELADA && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2 font-semibold">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Orden de Compra Cancelada el {formatDate(order.cancelledAt)}</span>
              </div>
              {order.cancelReason && (
                <p className="text-slate-600 dark:text-slate-300 pl-6">
                  <strong>Motivo:</strong> {order.cancelReason}
                </p>
              )}
            </div>
          )}

          {/* Notes Card (if present) */}
          {order.notes && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block">
                Notas / Observaciones
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          )}

          {/* Line Items Snapshots Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-0">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Ítems de la Orden ({order.items.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Valores congelados y cantidades ordenadas, recibidas y pendientes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3">SKU Proveedor</th>
                    <th className="py-2.5 px-3">U. Compra</th>
                    <th className="py-2.5 px-3 text-right">Cant. Ordenada</th>
                    <th className="py-2.5 px-3 text-right">Cant. Recibida</th>
                    <th className="py-2.5 px-3 text-right">Cant. Pendiente</th>
                    <th className="py-2.5 px-3 text-right">Costo Unit. Neto</th>
                    <th className="py-2.5 px-3 text-right">Subtotal Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item, index) => {
                    const isFullyReceived = Number(item.pendingQty) === 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Cód: {item.productCode}
                          </p>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {item.supplierSku}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {item.purchaseUnitName} ({item.purchaseUnitSymbol})
                          <div className="text-[10px] text-slate-400">
                            Factor: {item.conversionFactor}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                          {formatQuantity(item.orderedQty)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatQuantity(item.receivedQty)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-medium ${
                            isFullyReceived
                              ? 'text-slate-400'
                              : 'text-amber-600 dark:text-amber-400 font-bold'
                          }`}
                        >
                          {formatQuantity(item.pendingQty)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.expectedCostUnitNet)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.subtotalNet)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Net Footer */}
            <div className="p-4 bg-slate-50/75 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Total de líneas: <strong>{order.items.length}</strong>
              </span>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  Monto Total Neto:
                </span>
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(order.totalNet)}
                </span>
              </div>
            </div>
          </div>

          <GoodsReceiptsHistory
            purchaseOrderId={order.id}
            enabled={order.status !== PurchaseOrderStatus.BORRADOR}
          />
        </div>
      )}

      {/* Emission Modal */}
      <EmitPurchaseOrderModal
        isOpen={isEmitModalOpen}
        order={order}
        onConfirm={handleEmitConfirm}
        onCancel={() => setIsEmitModalOpen(false)}
        isSubmitting={emitMutation.isPending}
      />

      {/* Cancellation Modal */}
      <CancelPurchaseOrderModal
        isOpen={isCancelModalOpen}
        order={order}
        onConfirm={handleCancelConfirm}
        onCancel={() => setIsCancelModalOpen(false)}
        isSubmitting={cancelMutation.isPending}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, PackageCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseOrderStatusBadge } from '@/features/purchase-orders/components/PurchaseOrderStatusBadge';
import { GoodsReceiptForm } from '@/features/purchase-orders/components/goods-receipts/GoodsReceiptForm';
import { GoodsReceiptSuccessSummary } from '@/features/purchase-orders/components/goods-receipts/GoodsReceiptSuccessSummary';
import { usePurchaseOrderDetailQuery } from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import { getPurchaseOrderErrorMessage } from '@/features/purchase-orders/utils/purchase-orders.errors';
import type {
  ICreateGoodsReceiptResponse,
  IPurchaseOrderDetail,
} from '@/features/purchase-orders/types/purchase-orders.types';
import { PurchaseOrderStatus } from '@/features/purchase-orders/types/purchase-orders.types';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PurchaseOrderReceivePage: React.FC = () => {
  const { id } = useParams({ from: '/app/purchases/orders/$id/receive' });
  const navigate = useNavigate();
  const validId = UUID_V4_PATTERN.test(id);
  const orderQuery = usePurchaseOrderDetailQuery(validId ? id : '');
  const [successResponse, setSuccessResponse] = useState<ICreateGoodsReceiptResponse | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const goToOrder = () => navigate({ to: '/purchases/orders/$id', params: { id } });

  const refreshOrder = async (): Promise<IPurchaseOrderDetail | undefined> => {
    setRefreshError(null);
    const result = await orderQuery.refetch();
    if (result.isError) {
      setRefreshError(
        'No se pudieron actualizar los saldos. Vuelva al detalle e intente nuevamente.',
      );
      return undefined;
    }
    return result.data;
  };

  const receiveAgain = async () => {
    const refreshedOrder = await refreshOrder();
    if (
      refreshedOrder &&
      (refreshedOrder.status === PurchaseOrderStatus.EMITIDA ||
        refreshedOrder.status === PurchaseOrderStatus.PARCIAL)
    ) {
      setSuccessResponse(null);
    } else if (refreshedOrder) {
      goToOrder();
    }
  };

  if (!validId) {
    return (
      <StateCard
        title="Identificador de orden inválido"
        message="La dirección no contiene un identificador válido de orden de compra."
        onBack={() => navigate({ to: '/purchases/orders' })}
      />
    );
  }

  if (orderQuery.isLoading) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900"
        aria-label="Cargando orden de compra"
      >
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        <p className="text-sm text-slate-500">Cargando saldos pendientes...</p>
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <StateCard
        title="No se pudo cargar la orden"
        message={getPurchaseOrderErrorMessage(orderQuery.error)}
        onBack={() => navigate({ to: '/purchases/orders' })}
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;
  const canReceive =
    order.status === PurchaseOrderStatus.EMITIDA || order.status === PurchaseOrderStatus.PARCIAL;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/purchases/orders">Compras</Link>
            <span>/</span>
            <Link to="/purchases/orders/$id" params={{ id }}>
              {order.orderNumber}
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">Recepción</span>
          </nav>
          <div className="flex items-center gap-3">
            <PackageCheck className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Registrar recepción
              </h1>
              <p className="text-sm text-slate-500">Orden {order.orderNumber}</p>
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={goToOrder}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al detalle
        </Button>
      </div>

      {refreshError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {refreshError}
        </div>
      )}

      {successResponse ? (
        <GoodsReceiptSuccessSummary
          response={successResponse}
          onViewOrder={goToOrder}
          onReceiveAgain={receiveAgain}
        />
      ) : !canReceive ? (
        <StateCard
          title="La orden no admite recepciones"
          message={`La orden se encuentra en estado ${order.status}. Solo las órdenes EMITIDA o PARCIAL pueden recibir mercadería.`}
          onBack={goToOrder}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Orden
              </p>
              <div className="mt-1 flex items-center gap-2">
                <strong className="font-mono text-lg">{order.orderNumber}</strong>
                <PurchaseOrderStatusBadge status={order.status} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Proveedor
              </p>
              <p className="mt-1 font-semibold">{order.supplier.businessName}</p>
              <p className="font-mono text-xs text-slate-500">CUIT {order.supplier.cuit}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Líneas pendientes
              </p>
              <p className="mt-1 flex items-center gap-2 text-lg font-bold">
                <Truck className="h-5 w-5 text-amber-500" />
                {order.items.filter((item) => Number(item.pendingQty) > 0).length}
              </p>
            </div>
          </section>
          <GoodsReceiptForm
            order={order}
            onSuccess={setSuccessResponse}
            onConcurrencyRefresh={refreshOrder}
            onCancel={goToOrder}
          />
        </>
      )}
    </div>
  );
};

interface StateCardProps {
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}

const StateCard: React.FC<StateCardProps> = ({ title, message, onBack, onRetry }) => (
  <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-white p-10 text-center dark:border-amber-800 dark:bg-slate-900">
    <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
    <h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
    <div className="mt-5 flex justify-center gap-2">
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
      <Button type="button" onClick={onBack}>
        Volver
      </Button>
    </div>
  </div>
);

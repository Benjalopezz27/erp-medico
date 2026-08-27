import React, { useState } from 'react';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { PurchaseOrderForm } from '@/features/purchase-orders/components/PurchaseOrderForm';
import { useCreatePurchaseOrderMutation } from '@/features/purchase-orders/hooks/use-purchase-order-mutations';
import { emitPurchaseOrderApi } from '@/features/purchase-orders/api/purchase-orders.api';
import { mapFormToCreatePayload } from '@/features/purchase-orders/schemas/purchase-order.schema';
import { getPurchaseOrderErrorMessage } from '@/features/purchase-orders/utils/purchase-orders.errors';
import type { IPurchaseOrderFormData } from '@/features/purchase-orders/types/purchase-orders.types';

export const PurchaseOrderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSavingAndEmitting, setIsSavingAndEmitting] = useState(false);

  const createMutation = useCreatePurchaseOrderMutation();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      navigate({ to: '/purchases/orders' });
    }
  };

  const handleSaveDraft = async (data: IPurchaseOrderFormData) => {
    setGeneralError(null);
    try {
      const payload = mapFormToCreatePayload(data);
      const created = await createMutation.mutateAsync(payload);
      navigate({
        to: '/purchases/orders/$id',
        params: { id: created.id },
      });
    } catch (err) {
      setGeneralError(getPurchaseOrderErrorMessage(err));
    }
  };

  const handleSaveAndEmit = async (data: IPurchaseOrderFormData) => {
    setGeneralError(null);
    setIsSavingAndEmitting(true);

    let createdId: string | null = null;
    let createdOrderNumber: string | null = null;

    try {
      // 1. Create draft
      const payload = mapFormToCreatePayload(data);
      const created = await createMutation.mutateAsync(payload);
      createdId = created.id;
      createdOrderNumber = created.orderNumber;

      // 2. Composite Emit
      await emitPurchaseOrderApi(created.id);

      navigate({
        to: '/purchases/orders/$id',
        params: { id: created.id },
      });
    } catch (err) {
      const errorMsg = getPurchaseOrderErrorMessage(err);

      if (createdId) {
        // Creation succeeded, but emission failed! Do NOT retry creation.
        alert(
          `La orden fue creada en BORRADOR (${createdOrderNumber}), pero no pudo ser emitida automáticamente: ${errorMsg}. Será redirigido al detalle para revisar y emitir.`,
        );
        navigate({
          to: '/purchases/orders/$id',
          params: { id: createdId },
        });
      } else {
        setGeneralError(errorMsg);
      }
    } finally {
      setIsSavingAndEmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-200">
            Inicio
          </Link>
          <span>/</span>
          <Link to="/purchases/orders" className="hover:text-slate-600 dark:hover:text-slate-200">
            Compras
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold">
            Nueva Orden de Compra
          </span>
        </nav>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Nueva Orden de Compra
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Confección de borrador de orden de compra a proveedor.
        </p>
      </div>

      {/* General Submission Error Banner */}
      {generalError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">No se pudo crear la orden de compra</p>
            <p className="mt-0.5">{generalError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <PurchaseOrderForm
        onSaveDraft={handleSaveDraft}
        onSaveAndEmit={handleSaveAndEmit}
        onCancel={handleBack}
        isSubmitting={createMutation.isPending}
        isSavingAndEmitting={isSavingAndEmitting}
        showSaveAndEmit={true}
        isEditMode={false}
      />
    </div>
  );
};

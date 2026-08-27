import React, { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { AlertCircle, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ICreateGoodsReceiptPayload,
  ICreateGoodsReceiptResponse,
  IGoodsReceiptFormData,
  IPurchaseOrderDetail,
} from '../../types/purchase-orders.types';
import { PurchaseOrderStatus } from '../../types/purchase-orders.types';
import {
  buildGoodsReceiptInitialValues,
  createGoodsReceiptFormSchema,
  mapGoodsReceiptFormToPayload,
} from '../../schemas/goods-receipt.schema';
import { determineAnticipatedPurchaseOrderStatus } from '../../utils/goods-receipt.math';
import { parseGoodsReceiptApiError } from '../../utils/goods-receipt.errors';
import { useCreateGoodsReceiptMutation } from '../../hooks/use-goods-receipt-mutation';
import { GoodsReceiptLinesTable } from './GoodsReceiptLinesTable';
import { GoodsReceiptConfirmationDialog } from './GoodsReceiptConfirmationDialog';

interface GoodsReceiptFormProps {
  order: IPurchaseOrderDetail;
  onSuccess: (response: ICreateGoodsReceiptResponse) => void;
  onConcurrencyRefresh: () => Promise<IPurchaseOrderDetail | undefined>;
  onCancel: () => void;
}

export const GoodsReceiptForm: React.FC<GoodsReceiptFormProps> = ({
  order,
  onSuccess,
  onConcurrencyRefresh,
  onCancel,
}) => {
  const schema = useMemo(() => createGoodsReceiptFormSchema(order), [order]);
  const mutation = useCreateGoodsReceiptMutation(order.id);
  const [preparedPayload, setPreparedPayload] = useState<ICreateGoodsReceiptPayload | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm<IGoodsReceiptFormData>({
    resolver: zodResolver(schema) as Resolver<IGoodsReceiptFormData>,
    defaultValues: buildGoodsReceiptInitialValues(order),
    mode: 'onSubmit',
    shouldFocusError: true,
  });

  const watchedItems = useWatch({ control, name: 'items' }) ?? [];
  const quantities = Object.fromEntries(
    watchedItems.map((item) => [item.purchaseOrderItemId, item.receivedQtyPurchaseUnit ?? '']),
  );
  const anticipatedStatus = determineAnticipatedPurchaseOrderStatus(order.items, quantities);

  const prepareConfirmation = (data: IGoodsReceiptFormData) => {
    setGeneralError(null);
    setPreparedPayload(mapGoodsReceiptFormToPayload(data));
  };

  const confirmReceipt = async () => {
    if (!preparedPayload || mutation.isPending) return;
    setGeneralError(null);

    try {
      const response = await mutation.mutateAsync(preparedPayload);
      setPreparedPayload(null);
      onSuccess(response);
    } catch (error) {
      const parsed = parseGoodsReceiptApiError(error);
      setPreparedPayload(null);

      if (parsed.kind === 'DUPLICATE_DELIVERY_NOTE') {
        setError('deliveryNoteNumber', { type: 'server', message: parsed.message });
        setFocus('deliveryNoteNumber');
        return;
      }

      if (parsed.kind === 'CONCURRENCY') {
        const currentDeliveryNote = getValues('deliveryNoteNumber');
        const refreshedOrder = await onConcurrencyRefresh();
        if (refreshedOrder) {
          reset({
            ...buildGoodsReceiptInitialValues(refreshedOrder),
            deliveryNoteNumber: currentDeliveryNote,
          });
        }
        setGeneralError(
          `${parsed.message} Los saldos fueron actualizados; revise nuevamente las cantidades.`,
        );
        return;
      }

      setGeneralError(parsed.message);
    }
  };

  const itemsError = (errors.items as unknown as { message?: string } | undefined)?.message;

  return (
    <>
      <form onSubmit={handleSubmit(prepareConfirmation)} className="space-y-6" noValidate>
        {generalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{generalError}</p>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label
            htmlFor="delivery-note-number"
            className="text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            Número de remito{' '}
            <span className="text-rose-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="delivery-note-number"
            type="text"
            autoComplete="off"
            maxLength={50}
            disabled={mutation.isPending}
            aria-invalid={Boolean(errors.deliveryNoteNumber)}
            aria-describedby={
              errors.deliveryNoteNumber ? 'delivery-note-error' : 'delivery-note-help'
            }
            placeholder="Ej.: 0001-00001234"
            className="mt-1.5 w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            {...register('deliveryNoteNumber')}
          />
          {errors.deliveryNoteNumber ? (
            <p id="delivery-note-error" className="mt-1 text-xs text-rose-600">
              {errors.deliveryNoteNumber.message}
            </p>
          ) : (
            <p id="delivery-note-help" className="mt-1 text-[11px] text-slate-400">
              Debe coincidir con el documento físico entregado por el proveedor.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Mercadería pendiente
            </h2>
            <p className="text-xs text-slate-500">
              Deje vacías las líneas que no fueron entregadas en este remito.
            </p>
          </div>
          <GoodsReceiptLinesTable
            orderItems={order.items}
            control={control}
            register={register}
            errors={errors}
            disabled={mutation.isPending}
          />
          {itemsError && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {itemsError}
            </p>
          )}
        </section>

        {anticipatedStatus && (
          <div
            className={`rounded-xl border p-4 text-sm ${anticipatedStatus === PurchaseOrderStatus.COMPLETADA ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'}`}
          >
            Estado previsto: <strong>{anticipatedStatus}</strong>{' '}
            {anticipatedStatus === PurchaseOrderStatus.COMPLETADA
              ? '— todas las líneas quedarán completas.'
              : '— la orden conservará mercadería pendiente.'}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <PackageCheck className="mr-1.5 h-4 w-4" />
            Revisar recepción
          </Button>
        </div>
      </form>

      <GoodsReceiptConfirmationDialog
        isOpen={Boolean(preparedPayload)}
        order={order}
        payload={preparedPayload}
        anticipatedStatus={anticipatedStatus}
        isSubmitting={mutation.isPending}
        onCancel={() => setPreparedPayload(null)}
        onConfirm={confirmReceipt}
      />
    </>
  );
};

import { useMemo, useRef, useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  PaymentMethod,
  ProductTaxTreatment,
  type ICustomer,
  type IProductSummary,
  type ISale,
} from '@erp/shared-types';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import { resolveCustomerPriceApi } from '@/features/customer-pricing/api/customer-pricing.api';
import { customerPricingKeys } from '@/features/customer-pricing/hooks/customer-pricing-keys';
import { PosCart } from '@/features/sales/components/pos/PosCart';
import { PosCommercialConditions } from '@/features/sales/components/pos/PosCommercialConditions';
import { PosSummary } from '@/features/sales/components/pos/PosSummary';
import { PosSuccessModal } from '@/features/sales/components/pos/PosSuccessModal';
import { posSaleSchema, type PosSaleFormValues } from '@/features/sales/schemas/sales.schema';
import {
  calculatePreviewLine,
  calculatePreviewTotals,
} from '@/features/sales/utils/sales-math.utils';
import { parseSalesError } from '@/features/sales/utils/sales.errors';
import { useCreateSaleMutation } from '@/features/sales/hooks/use-create-sale-mutation';
import type { ParsedSalesError, PosPreviewLine } from '@/features/sales/types/sales.types';

export function SalesNewPage() {
  const [products, setProducts] = useState<Map<string, IProductSummary>>(new Map());
  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [confirmedSale, setConfirmedSale] = useState<ISale | null>(null);
  const [submitError, setSubmitError] = useState<ParsedSalesError | null>(null);
  const submittingRef = useRef(false);
  const mutation = useCreateSaleMutation();
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PosSaleFormValues>({
    resolver: zodResolver(posSaleSchema),
    defaultValues: {
      customerId: null,
      isCreditSale: false,
      requiresFiscalInvoice: false,
      paymentMethod: PaymentMethod.EFECTIVO,
      items: [],
    },
  });
  const { append, remove } = useFieldArray({ control, name: 'items' });
  const values = useWatch({ control }) as PosSaleFormValues;
  const watchedItems = values.items;
  const items = useMemo(() => watchedItems ?? [], [watchedItems]);
  const pricingQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: customerPricingKeys.resolution(customer?.id ?? '', item.productId),
      queryFn: () => resolveCustomerPriceApi(customer!.id, item.productId),
      enabled: Boolean(customer?.id),
      retry: false,
    })),
  });

  useBlocker({
    shouldBlockFn: () => mutation.isPending,
    enableBeforeUnload: mutation.isPending,
    disabled: !mutation.isPending,
  });

  const lines = useMemo<PosPreviewLine[]>(
    () =>
      items.flatMap((item, index) => {
        const product = products.get(item.productId);
        if (!product) return [];
        const query = pricingQueries[index];
        const pricing = customer && query?.data?.customerId === customer.id ? query.data : null;
        const catalogPriceNet = pricing?.basePriceNet ?? String(product.activePriceNet);
        const finalPriceNet = pricing?.finalPriceNet ?? String(product.activePriceNet);
        const ivaPercentage = product.ivaPercentage;
        const calculated = calculatePreviewLine(
          finalPriceNet,
          item.quantityBase || 0,
          product.taxTreatment,
          ivaPercentage,
        );
        return [
          {
            product,
            quantityBase: item.quantityBase,
            pricing,
            catalogPriceNet,
            finalPriceNet: calculated.unitPriceNet,
            subtotalNet: calculated.subtotalNet,
            taxTreatment: product.taxTreatment,
            ivaPercentage: ivaPercentage === null ? null : String(ivaPercentage),
            ivaAmount: calculated.ivaAmount,
            subtotalGross: calculated.subtotalGross,
            isResolving: Boolean(customer && query?.isFetching),
            hasPricingError: Boolean(customer && query?.isError),
          },
        ];
      }),
    [customer, items, pricingQueries, products],
  );
  const totals = useMemo(() => calculatePreviewTotals(lines), [lines]);
  const isPricingBusy = lines.some((line) => line.isResolving);
  const hasIncompletePreview = lines.some(
    (line) =>
      line.hasPricingError ||
      (line.taxTreatment === ProductTaxTreatment.GRAVADO && line.ivaPercentage === null),
  );

  const addProduct = (product: IProductSummary | null) => {
    if (!product || items.some((item) => item.productId === product.id)) return;
    setProducts((current) => new Map(current).set(product.id, product));
    append({ productId: product.id, quantityBase: 1 });
    setSubmitError(null);
  };

  const removeProduct = (productId: string) => {
    const index = items.findIndex((item) => item.productId === productId);
    if (index >= 0) remove(index);
    setProducts((current) => {
      const next = new Map(current);
      next.delete(productId);
      return next;
    });
    setSubmitError(null);
  };

  const submit = handleSubmit(async (form) => {
    if (submittingRef.current || mutation.isPending || isPricingBusy || hasIncompletePreview)
      return;
    submittingRef.current = true;
    setSubmitError(null);
    try {
      const sale = await mutation.mutateAsync({
        customerId: form.customerId || null,
        isCreditSale: form.isCreditSale,
        requiresFiscalInvoice: form.requiresFiscalInvoice,
        paymentMethod: form.paymentMethod,
        items: form.items.map(({ productId, quantityBase }) => ({ productId, quantityBase })),
      });
      setConfirmedSale(sale);
      reset();
      setProducts(new Map());
      setCustomer(null);
    } catch (error) {
      setSubmitError(parseSalesError(error));
    } finally {
      submittingRef.current = false;
    }
  });

  return (
    <div className="space-y-5">
      <div>
        <nav className="mb-1 text-xs text-slate-400">
          <Link to="/sales" search={{ page: 1, limit: 20 }} className="hover:text-blue-600">
            Ventas
          </Link>{' '}
          / Nueva venta
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">Punto de Venta</h1>
        <p className="text-xs text-slate-500">
          Cargá los productos y confirmá la operación una sola vez.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-5" noValidate>
        <section className="space-y-4 lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-xs font-semibold text-slate-700">
              Agregar producto
            </label>
            <ProductSearchInput
              key={items.length}
              value={null}
              onSelect={addProduct}
              excludeIds={items.map((item) => item.productId)}
              disabled={mutation.isPending}
              autoFocus
            />
          </div>
          <PosCart
            lines={lines}
            disabled={mutation.isPending}
            stockError={submitError?.stock}
            onRemove={removeProduct}
            onRetryPricing={(productId) => {
              const index = items.findIndex((item) => item.productId === productId);
              if (index >= 0) void pricingQueries[index]?.refetch();
            }}
            onQuantityChange={(productId, quantity) => {
              const index = items.findIndex((item) => item.productId === productId);
              if (index >= 0)
                setValue(`items.${index}.quantityBase`, quantity, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              setSubmitError(null);
            }}
          />
          {errors.items?.message && (
            <p role="alert" className="text-xs text-rose-600">
              {errors.items.message}
            </p>
          )}
          {hasIncompletePreview && (
            <p role="alert" className="text-xs text-rose-600">
              No se puede confirmar hasta resolver precio e IVA de todos los productos.
            </p>
          )}
        </section>
        <aside className="space-y-4 lg:col-span-2">
          <PosCommercialConditions
            customer={customer}
            isCreditSale={Boolean(values.isCreditSale)}
            requiresFiscalInvoice={Boolean(values.requiresFiscalInvoice)}
            paymentMethod={values.paymentMethod ?? PaymentMethod.EFECTIVO}
            disabled={mutation.isPending}
            customerError={errors.customerId?.message}
            onCustomerChange={(selected) => {
              setCustomer(selected);
              setValue('customerId', selected?.id ?? null, { shouldValidate: true });
              setSubmitError(null);
            }}
            onCreditChange={(checked) => {
              setValue('isCreditSale', checked, { shouldValidate: true });
              if (checked) {
                setValue('requiresFiscalInvoice', true, { shouldValidate: true });
                setValue('paymentMethod', PaymentMethod.CTA_CTE, { shouldValidate: true });
              } else setValue('paymentMethod', PaymentMethod.EFECTIVO, { shouldValidate: true });
            }}
            onInvoiceChange={(checked) =>
              setValue('requiresFiscalInvoice', checked, { shouldValidate: true })
            }
            onPaymentMethodChange={(method) =>
              setValue('paymentMethod', method, { shouldValidate: true })
            }
          />
          <PosSummary
            totals={totals}
            pending={mutation.isPending}
            error={submitError}
            disabled={
              mutation.isPending || isPricingBusy || hasIncompletePreview || items.length === 0
            }
          />
        </aside>
      </form>
      <PosSuccessModal sale={confirmedSale} onNewSale={() => setConfirmedSale(null)} />
    </div>
  );
}

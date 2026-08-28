import { ArrowDown, ArrowUp, Boxes, CircleDollarSign, ShieldCheck, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PriceReviewStatus,
  type ISupplierInvoiceConfirmation,
} from '../types/supplier-invoices.types';
import {
  formatDecimalAr,
  formatMoneyAr,
  formatSignedMoneyAr,
  safeDecimal,
} from '../utils/supplier-invoices.math';

const dateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));

const reviewLabels: Record<PriceReviewStatus, string> = {
  [PriceReviewStatus.PENDIENTE]: 'Pendiente',
  [PriceReviewStatus.APROBADO]: 'Aprobada',
  [PriceReviewStatus.RECHAZADO]: 'Rechazada',
  [PriceReviewStatus.POSPUESTO]: 'Pospuesta',
};

export function SupplierInvoiceCostAdjustments({
  confirmation,
}: {
  confirmation: ISupplierInvoiceConfirmation;
}) {
  return (
    <section aria-labelledby="cost-adjustments-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="cost-adjustments-title" className="text-xl font-bold">
            Ajuste de costos
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Confirmada por {confirmation.confirmedBy.name} · {dateTime(confirmation.confirmedAt)}
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden="true" /> Aplicado
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ImpactCard
          icon={Boxes}
          title="Revalorización de inventario"
          value={confirmation.stockRevaluationTotal}
          className="border-blue-200 bg-blue-50 text-blue-950"
        />
        <ImpactCard
          icon={CircleDollarSign}
          title="Ajuste de COGS"
          value={confirmation.cogsAdjustmentTotal}
          className="border-violet-200 bg-violet-50 text-violet-950"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        Los importes se distribuyeron sobre el historial existente. Las cantidades de stock y sus
        movimientos no fueron modificados.
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[1900px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th scope="col" className="px-3 py-2">
                Producto
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo provisional compra
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo real compra
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Factor
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo provisional base
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo real base
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Diferencia base
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Confirmada base
              </th>
              <th scope="col" className="bg-blue-50 px-3 py-2 text-right text-blue-900">
                En stock
              </th>
              <th scope="col" className="bg-violet-50 px-3 py-2 text-right text-violet-900">
                Consumida
              </th>
              <th scope="col" className="bg-blue-50 px-3 py-2 text-right text-blue-900">
                Revalorización
              </th>
              <th scope="col" className="bg-violet-50 px-3 py-2 text-right text-violet-900">
                Ajuste COGS
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo producto anterior
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                Costo producto nuevo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {confirmation.adjustments.map((adjustment) => (
              <tr key={adjustment.id}>
                <td className="px-3 py-3">
                  <strong>{adjustment.productName}</strong>
                  <p className="font-mono text-[10px] text-slate-500">{adjustment.productCode}</p>
                </td>
                <Money value={adjustment.provisionalCostPurchaseUnitNet} />
                <Money value={adjustment.realCostPurchaseUnitNet} />
                <DecimalCell value={adjustment.conversionFactor} />
                <Money value={adjustment.provisionalCostBaseUnitNet} />
                <Money value={adjustment.realCostBaseUnitNet} />
                <SignedMoney value={adjustment.costDifferenceUnitNet} />
                <DecimalCell value={adjustment.invoicedQtyBase} places={2} />
                <DecimalCell
                  value={adjustment.onHandAllocatedQty}
                  places={2}
                  className="bg-blue-50/60"
                />
                <DecimalCell
                  value={adjustment.consumedAllocatedQty}
                  places={2}
                  className="bg-violet-50/60"
                />
                <SignedMoney value={adjustment.stockRevaluation} className="bg-blue-50/60" />
                <SignedMoney value={adjustment.cogsAdjustment} className="bg-violet-50/60" />
                <Money value={adjustment.previousProductCostNet} />
                <Money value={adjustment.newProductCostNet} strong />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="flex items-center font-bold">
            <Tag className="mr-2 h-4 w-4 text-amber-600" aria-hidden="true" /> Revisiones de precio
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            El costo y el precio sugerido se actualizaron, pero el precio activo no fue modificado.
            La decisión manual estará disponible en la bandeja de Sprint 6.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {confirmation.priceReviews.length === 0 && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500 lg:col-span-2">
              No se generaron revisiones porque esta confirmación no asignó una cantidad base
              positiva a ningún producto.
            </div>
          )}
          {confirmation.priceReviews.map((review) => (
            <article
              key={review.id}
              className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong>{review.productName}</strong>
                  <p className="font-mono text-[10px] text-slate-500">{review.productCode}</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  {reviewLabels[review.status] ?? review.status}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <ReviewValue label="Costo anterior" value={formatMoneyAr(review.previousCostNet)} />
                <ReviewValue label="Costo nuevo" value={formatMoneyAr(review.newCostNet)} strong />
                <ReviewValue
                  label="Sugerido anterior"
                  value={formatMoneyAr(review.previousSuggestedPriceNet)}
                />
                <ReviewValue
                  label="Sugerido nuevo"
                  value={formatMoneyAr(review.suggestedPriceNet)}
                  strong
                />
                <ReviewValue
                  label="Markup aplicado"
                  value={
                    review.markupPercentageSnapshot === null
                      ? 'Sin markup'
                      : `${formatDecimalAr(review.markupPercentageSnapshot)}%`
                  }
                />
                <ReviewValue
                  label="Precio activo sin cambios"
                  value={formatMoneyAr(review.activePriceNetSnapshot)}
                />
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImpactCard({
  icon: Icon,
  title,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  value: string;
  className: string;
}) {
  return (
    <article className={cn('rounded-xl border p-4', className)}>
      <div className="flex items-center text-xs font-semibold uppercase">
        <Icon className="mr-2 h-4 w-4" aria-hidden={true} /> {title}
      </div>
      <p className="mt-2 font-mono text-2xl font-bold">{formatSignedMoneyAr(value)}</p>
    </article>
  );
}

function Money({
  value,
  strong,
  className,
}: {
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td className={cn('px-3 py-3 text-right font-mono', strong && 'font-bold', className)}>
      {formatMoneyAr(value)}
    </td>
  );
}

function SignedMoney({ value, className }: { value: string; className?: string }) {
  const decimal = safeDecimal(value);
  return (
    <td
      className={cn(
        'px-3 py-3 text-right font-mono font-semibold',
        decimal.gt(0) && 'text-rose-700',
        decimal.lt(0) && 'text-emerald-700',
        decimal.isZero() && 'text-slate-500',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {decimal.gt(0) && <ArrowUp className="h-3 w-3" aria-label="Aumento" />}
        {decimal.lt(0) && <ArrowDown className="h-3 w-3" aria-label="Disminución" />}
        {formatSignedMoneyAr(decimal)}
      </span>
    </td>
  );
}

function DecimalCell({
  value,
  places = 4,
  className,
}: {
  value: string;
  places?: number;
  className?: string;
}) {
  return (
    <td className={cn('px-3 py-3 text-right font-mono', className)}>
      {formatDecimalAr(value, places)}
    </td>
  );
}

function ReviewValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('mt-0.5 font-mono', strong && 'font-bold')}>{value}</dd>
    </div>
  );
}

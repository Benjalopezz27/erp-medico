import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ArrowLeft, Calendar, UserRound } from 'lucide-react';
import { CustomerPricingRuleApplied, ProductTaxTreatment, type ISale } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatCurrency, formatDecimal } from '@/features/products/utils/products.math';
import { FiscalStatusBadge } from './FiscalStatusBadge';

const ruleLabels: Record<CustomerPricingRuleApplied, string> = {
  FIXED_PRICE: 'Precio fijo',
  PRODUCT_DISCOUNT: 'Desc. producto',
  GENERAL_DISCOUNT: 'Desc. general',
  CATALOG_PRICE: 'Catálogo',
};

export function SaleDetailView({ sale, extension }: { sale: ISale; extension?: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Venta confirmada</p>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-slate-900">{sale.saleNumber}</h1>
            <Badge variant="info">{sale.status}</Badge>
          </div>
        </div>
        <Link
          to="/sales"
          search={{ page: 1, limit: 20 }}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs' })}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Volver al historial
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Cliente</span>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-slate-400" />
            {sale.customer?.businessName ?? 'Consumidor final'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400">
            Vendedor y fecha
          </span>
          <p className="mt-2 text-sm font-semibold">{sale.user.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(sale.createdAt),
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-[11px] font-semibold uppercase text-slate-400">
            Condición comercial
          </span>
          <p className="mt-2 text-sm font-semibold">{sale.paymentMethod.replace('_', ' ')}</p>
          <p className="mt-1 text-xs text-slate-500">
            {sale.isCreditSale ? 'Venta a crédito' : 'Venta de contado'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3">Producto</th>
              <th className="px-3 py-3 text-right">Cantidad</th>
              <th className="px-3 py-3 text-right">Catálogo</th>
              <th className="px-3 py-3">Condición</th>
              <th className="px-3 py-3 text-right">Precio final</th>
              <th className="px-3 py-3 text-right">Neto</th>
              <th className="px-3 py-3 text-right">IVA</th>
              <th className="px-3 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...sale.items]
              .sort((a, b) => a.itemIndex - b.itemIndex)
              .map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {item.product.internalCode}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatDecimal(item.quantityBase)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(item.catalogPriceNet)}
                  </td>
                  <td className="px-3 py-3">
                    {ruleLabels[item.pricingRuleApplied]}
                    {item.discountPercentage && (
                      <span className="block text-[10px] text-emerald-700">
                        {formatDecimal(item.discountPercentage, 4)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(item.unitPriceNet)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(item.subtotalNet)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatCurrency(item.ivaAmount)}
                    <span className="block text-[10px] text-slate-400">
                      {item.taxTreatment === ProductTaxTreatment.GRAVADO
                        ? `${item.ivaPercentage}%`
                        : item.taxTreatment === ProductTaxTreatment.EXENTO
                          ? 'Exento'
                          : 'No gravado'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {formatCurrency(item.subtotalGross)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-4 text-right text-sm sm:grid-cols-3">
          <p>
            Neto gravado: <strong>{formatCurrency(sale.taxableNet)}</strong>
          </p>
          {Number(sale.exemptAmount) > 0 && (
            <p>
              Exento: <strong>{formatCurrency(sale.exemptAmount)}</strong>
            </p>
          )}
          {Number(sale.nonTaxedAmount) > 0 && (
            <p>
              No gravado: <strong>{formatCurrency(sale.nonTaxedAmount)}</strong>
            </p>
          )}
          <p>
            IVA: <strong>{formatCurrency(sale.ivaTotal)}</strong>
          </p>
          <p className="text-lg">
            Total: <strong className="text-blue-700">{formatCurrency(sale.totalGross)}</strong>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Documento fiscal</h2>
            <p className="mt-1 text-xs text-slate-500">
              {sale.fiscalDocument?.documentType ??
                (sale.requiresFiscalInvoice
                  ? 'Pendiente de numeración fiscal'
                  : 'La venta no solicitó factura')}
            </p>
          </div>
          <FiscalStatusBadge document={sale.fiscalDocument} />
        </div>
        {sale.fiscalDocument?.cae && (
          <p className="mt-3 font-mono text-xs">CAE: {sale.fiscalDocument.cae}</p>
        )}
      </div>
      {extension}
    </div>
  );
}

import { useState } from 'react';
import { AlertCircle, AlertTriangle, Download, HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/features/products/utils/products.math';
import { parseApiError } from '@/lib/errors/parse-api-error';
import {
  useCustomerAccountQuery,
  useDownloadAccountStatement,
} from '../hooks/use-receivables-query';
import { MOVEMENT_LABELS, formatDate } from '../utils/receivables.format';

const LEDGER_PAGE_SIZE = 25;

export function CustomerAccountTab({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const query = useCustomerAccountQuery(customerId, page, LEDGER_PAGE_SIZE);
  const download = useDownloadAccountStatement();

  if (query.isPending)
    return (
      <div aria-label="Cargando cuenta corriente" className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
      >
        <span className="flex gap-2">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(query.error).message}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </div>
    );

  const { summary, pendingInvoices, ledger } = query.data;
  const { aging } = summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">Saldo reconstruido a partir de los movimientos.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={download.isPending}
            onClick={() =>
              download.mutate({ customerId, customerDocument: summary.customerDocument })
            }
          >
            <Download className="mr-1.5 h-4 w-4" />
            Exportar PDF
          </Button>
          {pendingInvoices.length > 0 ? (
            <Link
              to="/payments/new"
              search={{ customerId }}
              className={buttonVariants({ size: 'sm' })}
            >
              <HandCoins className="mr-1.5 h-4 w-4" />
              Registrar cobro
            </Link>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled
              title="El cliente no tiene facturas pendientes"
              aria-label="Registrar cobro"
            >
              <HandCoins className="mr-1.5 h-4 w-4" />
              Registrar cobro
            </Button>
          )}
        </div>
      </div>
      {download.isError && (
        <p role="alert" className="text-xs text-rose-700">
          No se pudo descargar el resumen de cuenta. Intentá nuevamente.
        </p>
      )}

      {summary.exceedsCreditLimit && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800"
        >
          <AlertTriangle className="h-4 w-4" />
          El saldo supera el límite de crédito ({formatCurrency(summary.creditLimit)}).
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Saldo total" value={formatCurrency(summary.totalBalance)} strong />
        <Stat
          label="Límite de crédito"
          value={
            Number(summary.creditLimit) > 0 ? formatCurrency(summary.creditLimit) : 'Sin límite'
          }
        />
        <Stat label="Facturas pendientes" value={String(summary.pendingCount)} />
        <Stat label="Facturas parciales" value={String(summary.partialCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Saldo por antigüedad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-xs md:grid-cols-3">
          <Stat label="0-30 días" value={formatCurrency(aging.days0to30)} />
          <Stat label="31-60 días" value={formatCurrency(aging.days31to60)} />
          <Stat label="+60 días" value={formatCurrency(aging.days61plus)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Facturas pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvoices.length === 0 ? (
            <p className="text-xs text-slate-500">Sin facturas pendientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-2">Documento</th>
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2 text-right">Original</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-2">{invoice.documentReference}</td>
                      <td className="py-2">{formatDate(invoice.createdAt)}</td>
                      <td className="py-2">
                        <Badge variant={invoice.status === 'PARCIAL' ? 'warning' : 'info'}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">{formatCurrency(invoice.originalAmount)}</td>
                      <td className="py-2 text-right font-semibold">
                        {formatCurrency(invoice.currentBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Movimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ledger.data.length === 0 ? (
            <p className="text-xs text-slate-500">Sin movimientos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Documento</th>
                    <th className="py-2 text-right">Importe</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.data.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2">{formatDate(entry.createdAt)}</td>
                      <td className="py-2">
                        {MOVEMENT_LABELS[entry.movementType] ?? entry.movementType}
                      </td>
                      <td className="py-2">{entry.documentReference}</td>
                      <td className="py-2 text-right">{formatCurrency(entry.signedAmount)}</td>
                      <td className="py-2 text-right font-semibold">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ledger.meta.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span>
                Página {ledger.meta.page} de {ledger.meta.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= ledger.meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p
        className={
          strong ? 'mt-1 text-xl font-bold text-slate-900' : 'mt-1 text-base font-semibold'
        }
      >
        {value}
      </p>
    </div>
  );
}

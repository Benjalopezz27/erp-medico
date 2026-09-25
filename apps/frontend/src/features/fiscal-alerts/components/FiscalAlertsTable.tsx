import { Link } from '@tanstack/react-router';
import { ArcaStatus, type IFiscalDocument } from '@erp/shared-types';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiscalStatusBadge } from '@/features/sales/components/FiscalStatusBadge';
import { formatCurrency } from '@/features/products/utils/products.math';
import type { IFiscalAlertRow } from '../types/fiscal-alerts.types';

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function toFiscalDocument(row: IFiscalAlertRow): IFiscalDocument {
  return {
    id: row.id,
    saleId: row.saleId,
    saleReturnId: row.saleReturnId,
    documentType: row.documentType,
    pointOfSale: null,
    documentNumber: null,
    arcaStatus: row.arcaStatus,
    arcaErrorMessage: row.arcaErrorMessage,
  };
}

export function FiscalAlertsTable({
  rows,
  loading,
  onRetry,
}: {
  rows: IFiscalAlertRow[];
  loading: boolean;
  onRetry: (row: IFiscalAlertRow) => void;
}) {
  if (loading)
    return (
      <div
        className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        aria-label="Cargando alertas fiscales"
      />
    );
  if (rows.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">
        No hay comprobantes pendientes ni rechazados con los filtros aplicados.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">N° Venta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Importe</th>
            <th className="px-4 py-3 text-center">Intentos</th>
            <th className="px-4 py-3">Último intento</th>
            <th className="px-4 py-3">Próximo intento</th>
            <th className="px-4 py-3">Error</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono font-bold text-blue-700">
                {row.saleNumber}
                {row.saleReturnId && (
                  <span className="ml-1.5 block font-sans text-[10px] font-normal text-slate-400">
                    Nota de Crédito
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-medium">{row.customerName}</td>
              <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
              <td className="px-4 py-3">{row.documentType.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">
                <FiscalStatusBadge document={toFiscalDocument(row)} />
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold">
                {formatCurrency(row.amount)}
              </td>
              <td className="px-4 py-3 text-center">{row.attemptCount}</td>
              <td className="px-4 py-3">{formatDateTime(row.lastAttemptAt)}</td>
              <td className="px-4 py-3">
                {row.arcaStatus === ArcaStatus.PENDIENTE_FACTURACION && row.nextRetryAt
                  ? formatDateTime(row.nextRetryAt)
                  : '—'}
              </td>
              <td className="max-w-[220px] px-4 py-3 text-rose-700">
                {row.arcaErrorMessage ?? '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  {row.isRetryable && !row.hasActiveRetryJob && (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRetry(row)}>
                      Reintentar
                    </Button>
                  )}
                  <Link
                    to="/sales/$id"
                    params={{ id: row.saleId }}
                    aria-label={`Ver detalle de ${row.saleNumber}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

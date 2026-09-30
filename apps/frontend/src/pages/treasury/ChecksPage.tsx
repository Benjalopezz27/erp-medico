import { useState } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { CheckStatus, type ICheckListItem } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { CheckAction, CheckSearchParams } from '@/features/checks/api/checks.api';
import { CheckStatusBadge } from '@/features/checks/components/CheckStatusBadge';
import { EndorseCheckModal } from '@/features/checks/components/EndorseCheckModal';
import { RejectCheckModal } from '@/features/checks/components/RejectCheckModal';
import { useCheckActionMutation, useChecksQuery } from '@/features/checks/hooks/use-checks';
import {
  CHECK_ACTION_LABELS,
  CHECK_STATUS_LABELS,
  allowedCheckActions,
} from '@/features/checks/utils/check-actions';
import { formatCurrency } from '@/features/products/utils/products.math';
import { formatDate } from '@/features/receivables/utils/receivables.format';
import { parseApiError } from '@/lib/errors/parse-api-error';

const LIMIT = 20;

export function ChecksPage() {
  const [status, setStatus] = useState<CheckStatus | ''>('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<ICheckListItem | null>(null);
  const [endorsing, setEndorsing] = useState<ICheckListItem | null>(null);

  const params: CheckSearchParams = {
    page,
    limit: LIMIT,
    ...(status ? { status } : {}),
    ...(dueFrom ? { dueFrom } : {}),
    ...(dueTo ? { dueTo } : {}),
  };
  const query = useChecksQuery(params);
  const action = useCheckActionMutation();

  const run = (check: ICheckListItem, name: CheckAction) => {
    if (name === 'reject') setRejecting(check);
    else if (name === 'endorse') setEndorsing(check);
    else action.mutate({ id: check.id, action: name });
  };
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const meta = query.data?.meta;
  const dueSoon = query.data?.dueSoonCount ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de cheques</h1>
          <p className="text-xs text-slate-500">
            Cheques de terceros recibidos: cartera, depósito, endoso y rechazo.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {dueSoon > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          <AlertTriangle className="h-4 w-4" />
          {dueSoon === 1
            ? '1 cheque vence en los próximos 7 días.'
            : `${dueSoon} cheques vencen en los próximos 7 días.`}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          Estado
          <Select
            aria-label="Estado"
            value={status}
            onChange={(event) => filter(() => setStatus(event.target.value as CheckStatus | ''))}
          >
            <option value="">Todos</option>
            {Object.values(CheckStatus).map((value) => (
              <option key={value} value={value}>
                {CHECK_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          Vence desde
          <Input
            aria-label="Vence desde"
            type="date"
            value={dueFrom}
            onChange={(event) => filter(() => setDueFrom(event.target.value))}
          />
        </label>
        <label className="space-y-1 text-xs">
          Vence hasta
          <Input
            aria-label="Vence hasta"
            type="date"
            value={dueTo}
            onChange={(event) => filter(() => setDueTo(event.target.value))}
          />
        </label>
      </div>

      {query.isError && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(query.error).message}
        </p>
      )}
      {action.isError && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(action.error).message}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Banco</th>
              <th className="px-3 py-2">N° cheque</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2">Vencimiento</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {query.data?.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No hay cheques para los filtros elegidos.
                </td>
              </tr>
            )}
            {query.data?.data.map((check) => (
              <tr key={check.id}>
                <td className="px-3 py-2">{check.bankName}</td>
                <td className="px-3 py-2">{check.checkNumber}</td>
                <td className="px-3 py-2">{check.customerName}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(check.amount)}</td>
                <td className="px-3 py-2">{formatDate(check.dueDate)}</td>
                <td className="px-3 py-2">
                  <CheckStatusBadge status={check.status} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {allowedCheckActions(check.status).map((name) => (
                      <Button
                        key={name}
                        type="button"
                        size="sm"
                        variant={name === 'reject' ? 'destructive' : 'outline'}
                        disabled={action.isPending}
                        aria-label={`${CHECK_ACTION_LABELS[name]} cheque ${check.checkNumber}`}
                        onClick={() => run(check, name)}
                      >
                        {CHECK_ACTION_LABELS[name]}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      <RejectCheckModal check={rejecting} onClose={() => setRejecting(null)} />
      {endorsing && <EndorseCheckModal check={endorsing} onClose={() => setEndorsing(null)} />}
    </div>
  );
}

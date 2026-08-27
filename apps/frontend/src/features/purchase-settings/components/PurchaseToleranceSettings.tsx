import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Percent, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  usePurchaseSettingsQuery,
  useUpdatePurchaseSettingsMutation,
} from '../hooks/use-purchase-settings';
import { parsePurchaseSettingsError } from '../utils/purchase-settings.errors';
import { normalizeCostTolerance } from '../utils/purchase-settings.validation';

const dateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));

export function PurchaseToleranceSettings() {
  const query = usePurchaseSettingsQuery();
  const mutation = useUpdatePurchaseSettingsMutation();
  const [value, setValue] = useState('');
  const [confirmation, setConfirmation] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const currentTolerance = query.data?.costTolerancePercentage;

  useEffect(() => {
    if (currentTolerance) setValue(currentTolerance);
  }, [currentTolerance]);

  const validation = useMemo(() => normalizeCostTolerance(value), [value]);
  const changed = Boolean(
    query.data && validation.success && validation.value !== query.data.costTolerancePercentage,
  );

  const requestSave = () => {
    setError(undefined);
    if (!validation.success) {
      setError(validation.message);
      return;
    }
    if (changed) setConfirmation(validation.value);
  };

  const confirmSave = async () => {
    if (!confirmation || mutation.isPending) return;
    try {
      const settings = await mutation.mutateAsync({
        costTolerancePercentage: confirmation,
      });
      setValue(settings.costTolerancePercentage);
      setConfirmation(undefined);
      setNotice(
        `Tolerancia actualizada a ${settings.costTolerancePercentage}%${
          settings.updatedBy ? ` por ${settings.updatedBy.name}` : ''
        }.`,
      );
    } catch (caught) {
      setError(parsePurchaseSettingsError(caught));
      setConfirmation(undefined);
    }
  };

  if (query.isLoading) {
    return (
      <div
        aria-label="Cargando configuración de Compras"
        className="h-48 animate-pulse rounded-xl bg-slate-100"
      />
    );
  }
  if (query.isError || !query.data) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
      >
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4" /> No se pudo cargar la configuración de Compras
        </div>
        <p className="mt-1">{parsePurchaseSettingsError(query.error)}</p>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => query.refetch()}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700">
          <Percent className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Tolerancia de variación de costos</h2>
          <p className="mt-1 max-w-3xl text-xs text-slate-500">
            Una factura queda observada cuando la diferencia absoluta entre el costo real y el
            provisional supera este porcentaje. El cambio solo se aplica a facturas futuras.
          </p>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_1fr] md:items-end">
        <div>
          <label htmlFor="cost-tolerance" className="mb-1.5 block text-xs font-semibold">
            Porcentaje de tolerancia
          </label>
          <div className="relative">
            <Input
              id="cost-tolerance"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(undefined);
                setNotice(undefined);
              }}
              inputMode="decimal"
              aria-invalid={!validation.success}
              disabled={mutation.isPending}
              className="pr-9 font-mono"
            />
            <span className="absolute right-3 top-2.5 text-sm text-slate-400">%</span>
          </div>
          {!validation.success && value && (
            <p className="mt-1 text-xs text-rose-600">{validation.message}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Última actualización: {dateTime(query.data.updatedAt)} ·{' '}
            {query.data.updatedBy?.name ?? 'Configuración inicial'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={requestSave}
            disabled={!changed || !validation.success || mutation.isPending}
          >
            Guardar tolerancia
          </Button>
        </div>
      </div>

      <Modal
        isOpen={Boolean(confirmation)}
        onClose={() => {
          if (!mutation.isPending) setConfirmation(undefined);
        }}
        title="Confirmar nueva tolerancia"
        description="Las facturas ya registradas conservan el porcentaje con el que fueron evaluadas."
        showCloseButton={!mutation.isPending}
      >
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4">
            <dt>Valor actual</dt>
            <dd className="text-right font-mono">{query.data.costTolerancePercentage}%</dd>
            <dt>Nuevo valor</dt>
            <dd className="text-right font-mono font-bold">{confirmation}%</dd>
          </dl>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmation(undefined)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={confirmSave} disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Confirmar cambio'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { TaxCondition } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useSystemConfigQuery, useUpdateSystemConfigMutation } from '../hooks/use-system-config';
import {
  buildPatch,
  toForm,
  type SystemConfigErrors,
  type SystemConfigForm as FormState,
} from '../utils/system-config.form';

const TAX_LABELS: Record<TaxCondition, string> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]: 'Responsable Inscripto',
  [TaxCondition.MONOTRIBUTO]: 'Monotributo',
  [TaxCondition.EXENTO]: 'Exento',
  [TaxCondition.CONSUMIDOR_FINAL]: 'Consumidor Final',
};

export function SystemConfigForm() {
  const query = useSystemConfigQuery();
  const mutation = useUpdateSystemConfigMutation();
  const [form, setForm] = useState<FormState>();
  const [errors, setErrors] = useState<SystemConfigErrors>({});
  const [notice, setNotice] = useState<string>();
  const [serverError, setServerError] = useState<string>();

  useEffect(() => {
    if (query.data) setForm(toForm(query.data));
  }, [query.data]);

  if (query.isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
      >
        <AlertCircle className="mr-2 inline h-4 w-4" />
        No se pudo cargar la configuración general.
        <Button className="ml-3" size="sm" variant="outline" onClick={() => query.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!query.data || !form) {
    return (
      <div
        aria-label="Cargando configuración general"
        className="h-48 animate-pulse rounded-xl bg-slate-100"
      />
    );
  }

  const set = (field: keyof FormState, value: string) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: undefined });
    setNotice(undefined);
    setServerError(undefined);
  };

  const save = async () => {
    const { patch, errors: found } = buildPatch(query.data, form);
    setErrors(found);
    if (Object.keys(found).length || !Object.keys(patch).length) return;
    try {
      await mutation.mutateAsync(patch);
      setNotice('Configuración guardada.');
    } catch {
      setServerError('No se pudo guardar la configuración. Revise los datos e intente de nuevo.');
    }
  };

  const field = (id: keyof FormState, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      {input}
      {errors[id] && <p className="mt-1 text-xs text-rose-600">{errors[id]}</p>}
    </div>
  );

  return (
    <section className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="font-semibold">Configuración general</h2>
        <p className="mt-1 text-xs text-slate-500">
          Datos del emisor, punto de venta ARCA y moneda operativa.
        </p>
      </div>

      <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          El CUIT y el punto de venta se guardan, pero la emisión ante ARCA y el CUIT del PDF fiscal
          siguen usando la configuración del servidor hasta el Go-Live.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      {serverError && (
        <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {field(
          'issuerRazonSocial',
          'Razón social del emisor',
          <Input
            id="issuerRazonSocial"
            value={form.issuerRazonSocial}
            onChange={(e) => set('issuerRazonSocial', e.target.value)}
          />,
        )}
        {field(
          'issuerCuit',
          'CUIT del emisor',
          <Input
            id="issuerCuit"
            value={form.issuerCuit}
            inputMode="numeric"
            className="font-mono"
            onChange={(e) => set('issuerCuit', e.target.value)}
          />,
        )}
        {field(
          'issuerTaxCondition',
          'Condición fiscal del emisor',
          <Select
            id="issuerTaxCondition"
            value={form.issuerTaxCondition}
            onChange={(e) => set('issuerTaxCondition', e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {Object.values(TaxCondition).map((c) => (
              <option key={c} value={c}>
                {TAX_LABELS[c]}
              </option>
            ))}
          </Select>,
        )}
        {field(
          'arcaPuntoVenta',
          'Punto de venta ARCA',
          <Input
            id="arcaPuntoVenta"
            value={form.arcaPuntoVenta}
            inputMode="numeric"
            className="font-mono"
            onChange={(e) => set('arcaPuntoVenta', e.target.value)}
          />,
        )}
        {field(
          'operatingCurrency',
          'Moneda operativa',
          <Select
            id="operatingCurrency"
            value={form.operatingCurrency}
            onChange={(e) => set('operatingCurrency', e.target.value)}
          >
            <option value="ARS">Peso argentino (ARS)</option>
            <option value="USD">Dólar estadounidense (USD)</option>
          </Select>,
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </div>
    </section>
  );
}

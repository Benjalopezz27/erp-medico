import {
  TaxCondition,
  isValidCuit,
  type ISystemConfig,
  type IUpdateSystemConfigPayload,
  type OperatingCurrency,
} from '@erp/shared-types';

export interface SystemConfigForm {
  issuerRazonSocial: string;
  issuerCuit: string;
  issuerTaxCondition: string;
  arcaPuntoVenta: string;
  operatingCurrency: OperatingCurrency;
}

export type SystemConfigErrors = Partial<Record<keyof SystemConfigForm, string>>;

export const toForm = (c: ISystemConfig): SystemConfigForm => ({
  issuerRazonSocial: c.issuerRazonSocial ?? '',
  issuerCuit: c.issuerCuit ?? '',
  issuerTaxCondition: c.issuerTaxCondition ?? '',
  arcaPuntoVenta: c.arcaPuntoVenta?.toString() ?? '',
  operatingCurrency: c.operatingCurrency,
});

const RULES: Record<keyof SystemConfigForm, (v: string) => string | null> = {
  issuerRazonSocial: (v) =>
    !v.trim() || v.trim().length > 150
      ? 'La razón social debe tener entre 1 y 150 caracteres.'
      : null,
  issuerCuit: (v) =>
    isValidCuit(v.trim()) ? null : 'El CUIT no es válido (11 dígitos con verificador).',
  issuerTaxCondition: (v) =>
    (Object.values(TaxCondition) as string[]).includes(v)
      ? null
      : 'Seleccione una condición fiscal.',
  arcaPuntoVenta: (v) =>
    /^\d{1,5}$/.test(v) && Number(v) >= 1
      ? null
      : 'El punto de venta debe ser un entero entre 1 y 99999.',
  operatingCurrency: (v) => (v === 'ARS' || v === 'USD' ? null : 'Moneda inválida.'),
};

/** Solo valida y envía los campos que cambiaron respecto de la configuración vigente. */
export function buildPatch(
  current: ISystemConfig,
  form: SystemConfigForm,
): { patch: IUpdateSystemConfigPayload; errors: SystemConfigErrors } {
  const initial = toForm(current);
  const patch: Record<string, unknown> = {};
  const errors: SystemConfigErrors = {};
  for (const field of Object.keys(RULES) as (keyof SystemConfigForm)[]) {
    if (form[field] === initial[field]) continue;
    const error = RULES[field](form[field]);
    if (error) errors[field] = error;
    else patch[field] = field === 'arcaPuntoVenta' ? Number(form[field]) : form[field].trim();
  }
  return { patch: patch as IUpdateSystemConfigPayload, errors };
}

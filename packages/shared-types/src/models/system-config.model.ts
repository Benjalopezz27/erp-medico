import { TaxCondition } from '../enums/financial.enum';

export type OperatingCurrency = 'ARS' | 'USD';

/** Valor efectivo: base de datos, si no variable de entorno, si no default. */
export interface ISystemConfig {
  issuerRazonSocial: string | null;
  issuerCuit: string | null;
  issuerTaxCondition: TaxCondition | null;
  arcaPuntoVenta: number | null;
  operatingCurrency: OperatingCurrency;
}

export type IUpdateSystemConfigPayload = Partial<
  Omit<ISystemConfig, 'operatingCurrency'> & {
    operatingCurrency: OperatingCurrency;
  }
>;

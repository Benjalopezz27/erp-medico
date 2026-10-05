import { TreasuryAccountType, TreasuryMovementType } from '@erp/shared-types';

export const ACCOUNT_LABELS: Record<TreasuryAccountType, string> = {
  [TreasuryAccountType.EFECTIVO]: 'Efectivo',
  [TreasuryAccountType.BANCOS]: 'Bancos / Transferencias',
  [TreasuryAccountType.CHEQUES_CARTERA]: 'Cheques en cartera',
};

export const MOVEMENT_TYPE_LABELS: Record<TreasuryMovementType, string> = {
  [TreasuryMovementType.INGRESO]: 'Ingreso',
  [TreasuryMovementType.EGRESO]: 'Egreso',
};

/** Orden fijo de las tarjetas de saldo. */
export const ACCOUNT_ORDER = [
  TreasuryAccountType.EFECTIVO,
  TreasuryAccountType.BANCOS,
  TreasuryAccountType.CHEQUES_CARTERA,
];

export const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));

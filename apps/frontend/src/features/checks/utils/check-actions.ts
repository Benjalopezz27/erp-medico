import { CheckStatus } from '@erp/shared-types';
import type { CheckAction } from '../api/checks.api';

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  [CheckStatus.RECIBIDO]: 'Recibido',
  [CheckStatus.EN_CARTERA]: 'En cartera',
  [CheckStatus.DEPOSITADO]: 'Depositado',
  [CheckStatus.ENDOSADO]: 'Endosado',
  [CheckStatus.RECHAZADO]: 'Rechazado',
};

export const CHECK_ACTION_LABELS: Record<CheckAction, string> = {
  'to-cartera': 'Mover a cartera',
  deposit: 'Depositar',
  endorse: 'Endosar',
  reject: 'Registrar rechazo',
};

const ACTIONS_BY_STATUS: Record<CheckStatus, CheckAction[]> = {
  [CheckStatus.RECIBIDO]: ['to-cartera'],
  [CheckStatus.EN_CARTERA]: ['deposit', 'endorse', 'reject'],
  [CheckStatus.DEPOSITADO]: ['reject'],
  [CheckStatus.ENDOSADO]: [],
  [CheckStatus.RECHAZADO]: [],
};

/** Acciones válidas según el estado (espejo de la máquina de estados del backend). */
export function allowedCheckActions(status: CheckStatus): CheckAction[] {
  return ACTIONS_BY_STATUS[status];
}

import { AccountReceivableMovementType } from '@erp/shared-types';

export const MOVEMENT_LABELS: Record<AccountReceivableMovementType, string> = {
  [AccountReceivableMovementType.FACTURA]: 'Factura',
  [AccountReceivableMovementType.PAGO]: 'Pago',
  [AccountReceivableMovementType.NOTA_CREDITO]: 'Nota de crédito',
  [AccountReceivableMovementType.REVERSION_CHEQUE]: 'Rechazo de cheque',
};

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function buildStatementFilename(customerDocument: string, date: Date): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    .format(date)
    .replace(/-/g, '');
  return `resumen-cuenta-${customerDocument}-${day}.pdf`;
}

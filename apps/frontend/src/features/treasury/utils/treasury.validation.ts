export interface MovementFormErrors {
  amount?: string;
  concept?: string;
}

/** Valida el movimiento manual: monto > 0 con hasta 2 decimales y concepto de 1 a 200 caracteres. */
export function validateMovement(amount: string, concept: string): MovementFormErrors {
  const errors: MovementFormErrors = {};
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    errors.amount = 'Ingrese un monto mayor a 0 con hasta 2 decimales.';
  }
  if (!concept.trim() || concept.trim().length > 200) {
    errors.concept = 'El concepto es obligatorio (hasta 200 caracteres).';
  }
  return errors;
}

export const normalizeAmount = (amount: string): string => amount.trim().replace(',', '.');

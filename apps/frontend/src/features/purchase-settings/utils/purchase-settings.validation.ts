import Decimal from 'decimal.js';

export function normalizeCostTolerance(
  value: string,
): { success: true; value: string } | { success: false; message: string } {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,4})?$/.test(trimmed)) {
    return {
      success: false,
      message: 'Ingrese un porcentaje con hasta 4 decimales.',
    };
  }
  try {
    const decimal = new Decimal(trimmed);
    if (!decimal.isFinite() || decimal.lt(0) || decimal.gt(100)) {
      return {
        success: false,
        message: 'La tolerancia debe estar entre 0 y 100%.',
      };
    }
    return { success: true, value: decimal.toFixed(4) };
  } catch {
    return { success: false, message: 'Ingrese un porcentaje válido.' };
  }
}

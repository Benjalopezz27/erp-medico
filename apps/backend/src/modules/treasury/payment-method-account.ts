import { PaymentMethod, TreasuryAccountType } from '@erp/shared-types';

/** Cuenta de tesorería que recibe un medio de pago; `null` si no mueve tesorería (cuenta corriente). */
export function accountForPaymentMethod(
  method: PaymentMethod,
): TreasuryAccountType | null {
  switch (method) {
    case PaymentMethod.EFECTIVO:
      return TreasuryAccountType.EFECTIVO;
    case PaymentMethod.CHEQUE:
      return TreasuryAccountType.CHEQUES_CARTERA;
    case PaymentMethod.CTA_CTE:
      return null;
    default:
      // TRANSFERENCIA, DEBITO, CREDITO y QR acreditan en bancos.
      return TreasuryAccountType.BANCOS;
  }
}

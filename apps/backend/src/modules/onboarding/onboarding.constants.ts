import { OnboardingStepId } from '@erp/shared-types';

export const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
export const skipKey = (id: OnboardingStepId): string =>
  `onboarding_skip_${id}`;

/** Orden del wizard. `required: false` admite "omitir por ahora". */
export const ONBOARDING_STEPS: ReadonlyArray<{
  id: OnboardingStepId;
  required: boolean;
}> = [
  { id: 'fiscal', required: true },
  { id: 'users', required: true },
  { id: 'catalog-base', required: true },
  { id: 'products', required: false },
  { id: 'parties', required: false },
  // Los medios de pago son un enum fijo y las cuentas se siembran: lo único
  // cargable es el saldo inicial, que puede ser cero.
  { id: 'treasury', required: false },
  { id: 'stock', required: false },
];

import { ContextHintId, OnboardingStepId } from '@erp/shared-types';

export const DISMISSED_KEY = 'onboarding_dismissed';
export const HINT_KEY_PREFIX = 'hint_dismissed_';

/** Orden de los pasos y su consulta de existencia (sin conteos). */
export const STEP_IDS: readonly OnboardingStepId[] = [
  'fiscal',
  'users',
  'catalog-base',
  'products',
  'parties',
  'treasury',
  'stock',
];

export const HINT_IDS: readonly ContextHintId[] = [
  'products',
  'purchases',
  'sales',
];

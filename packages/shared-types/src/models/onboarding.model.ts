export type OnboardingStepId =
  'fiscal' | 'users' | 'catalog-base' | 'products' | 'parties' | 'treasury' | 'stock';

export type ContextHintId = 'products' | 'purchases' | 'sales';

export interface IOnboardingStep {
  id: OnboardingStepId;
  done: boolean;
}

export interface IOnboardingStatus {
  steps: IOnboardingStep[];
  /** El administrador descartó el bloque "Primeros pasos". */
  dismissed: boolean;
  hintsDismissed: ContextHintId[];
}

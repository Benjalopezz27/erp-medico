export type OnboardingStepId =
  'fiscal' | 'users' | 'catalog-base' | 'products' | 'parties' | 'treasury' | 'stock';

export type OnboardingStepState = 'done' | 'skipped' | 'pending';

export interface IOnboardingStep {
  id: OnboardingStepId;
  required: boolean;
  state: OnboardingStepState;
}

export interface IOnboardingStatus {
  completed: boolean;
  steps: IOnboardingStep[];
  /** Primer paso `pending`, `null` si no queda ninguno. */
  pendingStep: OnboardingStepId | null;
}

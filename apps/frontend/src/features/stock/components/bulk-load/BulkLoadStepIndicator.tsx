import React from 'react';
import { UploadCloud, CheckCircle2, ShieldCheck } from 'lucide-react';

export type BulkLoadStep = 'UPLOAD' | 'PREVIEW' | 'CONFIRM' | 'SUCCESS';

interface BulkLoadStepIndicatorProps {
  currentStep: BulkLoadStep;
}

interface StepDef {
  key: BulkLoadStep;
  label: string;
  number: number;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { key: 'UPLOAD', label: 'Cargar Archivo', number: 1, icon: UploadCloud },
  { key: 'PREVIEW', label: 'Validación', number: 2, icon: CheckCircle2 },
  { key: 'CONFIRM', label: 'Confirmación', number: 3, icon: ShieldCheck },
];

export const BulkLoadStepIndicator: React.FC<BulkLoadStepIndicatorProps> = ({ currentStep }) => {
  const getStepStatus = (stepKey: BulkLoadStep, stepNumber: number) => {
    if (currentStep === 'SUCCESS') return 'completed';
    if (currentStep === stepKey) return 'active';

    const stepOrder: Record<BulkLoadStep, number> = {
      UPLOAD: 1,
      PREVIEW: 2,
      CONFIRM: 3,
      SUCCESS: 4,
    };

    if (stepOrder[currentStep] > stepNumber) {
      return 'completed';
    }
    return 'upcoming';
  };

  return (
    <nav
      aria-label="Progreso de carga masiva"
      className="w-full bg-card border border-border rounded-xl p-4 shadow-sm"
    >
      <ol className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.key, step.number);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <li
                className="flex items-center gap-3 flex-1 min-w-0"
                aria-current={status === 'active' ? 'step' : undefined}
              >
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full font-semibold text-xs shrink-0 transition-colors ${
                    status === 'active'
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-medium uppercase tracking-wider ${
                      status === 'active'
                        ? 'text-primary'
                        : status === 'completed'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-muted-foreground'
                    }`}
                  >
                    Paso {step.number}
                  </p>
                  <p
                    className={`text-sm font-semibold truncate ${
                      status === 'active'
                        ? 'text-foreground'
                        : status === 'completed'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </li>

              {idx < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 max-w-[4rem] hidden sm:block rounded ${
                    getStepStatus(STEPS[idx + 1].key, STEPS[idx + 1].number) !== 'upcoming'
                      ? 'bg-emerald-500'
                      : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

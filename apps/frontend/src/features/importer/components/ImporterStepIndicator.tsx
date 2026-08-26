import { Check } from 'lucide-react';
import type { ImporterStep } from '../types/importer.types';

const steps: Array<{ key: ImporterStep; label: string }> = [
  { key: 'UPLOAD', label: 'Subida' },
  { key: 'MAP', label: 'Mapeo' },
  { key: 'PREVIEW', label: 'Revisión' },
  { key: 'CONFIRM', label: 'Confirmación' },
];

export function ImporterStepIndicator({ currentStep }: { currentStep: ImporterStep }) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep);
  return (
    <ol aria-label="Progreso de importación" className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const completed = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={step.key}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : completed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-border text-muted-foreground'
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
              {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

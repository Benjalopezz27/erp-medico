import { Link } from '@tanstack/react-router';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDismissOnboardingMutation, useOnboardingStatusQuery } from '../hooks/use-onboarding';
import { STEP_META } from '../utils/onboarding-steps';

/** Guía persistente: el progreso sale de los datos, nunca bloquea y se puede descartar. */
export function FirstStepsCard() {
  const { data } = useOnboardingStatusQuery(true);
  const dismiss = useDismissOnboardingMutation();
  if (!data || data.dismissed || data.steps.every((s) => s.done)) return null;

  const doneCount = data.steps.filter((s) => s.done).length;
  return (
    <Card className="p-5" aria-label="Primeros pasos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Primeros pasos</h2>
          <p className="text-sm text-slate-600">
            {doneCount} de {data.steps.length} listos. Cargá estos datos para vender y facturar sin
            sorpresas.
          </p>
        </div>
        <button
          type="button"
          aria-label="Descartar primeros pasos"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate(undefined)}
          className="text-slate-400 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {data.steps.map(({ id, done }) => {
          const meta = STEP_META[id];
          return (
            <li key={id} className="flex items-start gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-label="Hecho" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 text-slate-300" aria-label="Pendiente" />
              )}
              <div>
                <Link
                  to={meta.to}
                  className={done ? 'text-slate-500 line-through' : 'font-medium text-blue-700'}
                >
                  {meta.title}
                </Link>
                {!done && <p className="text-xs text-slate-500">{meta.description}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

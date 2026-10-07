import { Link, useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import type { IOnboardingStep } from '@erp/shared-types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SystemConfigForm } from '@/features/system-config/components/SystemConfigForm';
import {
  useArcaCertificateQuery,
  useCompleteOnboardingMutation,
  useOnboardingStatusQuery,
  useSkipStepMutation,
} from '../hooks/use-onboarding';
import { STEP_META } from '../utils/onboarding-steps';

const ICON = {
  done: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-label="Completo" />,
  skipped: <MinusCircle className="h-5 w-5 text-slate-400" aria-label="Omitido" />,
  pending: <Circle className="h-5 w-5 text-slate-300" aria-label="Pendiente" />,
};

function CertificateStatus() {
  const { data, isLoading, isError } = useArcaCertificateQuery();
  const text = isLoading
    ? 'Verificando certificado ARCA…'
    : isError
      ? 'No se pudo verificar el certificado ARCA.'
      : data?.hasCertificate
        ? 'Certificado ARCA configurado en el servidor.'
        : 'Certificado ARCA no configurado: se carga como variable de entorno del servidor, no desde esta pantalla.';
  return (
    <p role="status" className="text-sm text-slate-600">
      {text}
    </p>
  );
}

function StepCard({ step, active }: { step: IOnboardingStep; active: boolean }) {
  const meta = STEP_META[step.id];
  const skip = useSkipStepMutation();
  return (
    <Card className={active ? 'p-5 ring-2 ring-primary/40' : 'p-5'}>
      <div className="flex items-start gap-3">
        {ICON[step.state]}
        <div className="flex-1 space-y-2">
          <h2 className="font-semibold">
            {meta.title}
            {!step.required && <span className="ml-2 text-xs text-slate-500">(opcional)</span>}
          </h2>
          <p className="text-sm text-slate-600">{meta.description}</p>
          {step.id === 'fiscal' && active && (
            <>
              <CertificateStatus />
              <SystemConfigForm />
            </>
          )}
          {meta.to && step.state !== 'done' && (
            <div className="flex gap-2">
              <Link to={meta.to} className={buttonVariants({ size: 'sm' })}>
                {meta.linkLabel}
              </Link>
              {!step.required && step.state === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={skip.isPending}
                  onClick={() => skip.mutate(step.id)}
                >
                  Omitir por ahora
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data, isError, refetch } = useOnboardingStatusQuery();
  const complete = useCompleteOnboardingMutation();

  if (isError) {
    return (
      <div role="alert" className="p-6 text-sm">
        No se pudo cargar el estado de la configuración inicial.
        <Button className="ml-3" size="sm" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!data) return <div className="p-6 text-sm text-slate-500">Cargando…</div>;

  const ready = data.pendingStep === null;
  const finish = async () => {
    await complete.mutateAsync(undefined);
    await navigate({ to: '/' });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Configuración inicial</h1>
        <p className="text-sm text-slate-600">
          Completá los pasos obligatorios antes de vender o facturar. Los opcionales se pueden
          cargar después desde cada módulo.
        </p>
      </header>
      {data.steps.map((step) => (
        <StepCard key={step.id} step={step} active={step.id === data.pendingStep} />
      ))}
      <Button disabled={!ready || complete.isPending} onClick={finish}>
        Finalizar configuración
      </Button>
    </div>
  );
}

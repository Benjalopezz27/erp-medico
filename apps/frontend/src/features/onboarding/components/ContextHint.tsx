import { Info } from 'lucide-react';
import { UserRole, type ContextHintId } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useDismissHintMutation, useOnboardingStatusQuery } from '../hooks/use-onboarding';

/** Cartel explicativo de una sola vez por pantalla; el descarte persiste en el servidor. */
export function ContextHint({
  id,
  title,
  text,
}: {
  id: ContextHintId;
  title: string;
  text: string;
}) {
  const isAdmin = useAuthStore((s) => s.user?.role) === UserRole.ADMINISTRADOR;
  const { data } = useOnboardingStatusQuery(isAdmin);
  const dismiss = useDismissHintMutation();
  if (!isAdmin || !data || data.hintsDismissed.includes(id)) return null;

  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p>{text}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={dismiss.isPending}
        onClick={() => dismiss.mutate(id)}
      >
        Entendido
      </Button>
    </div>
  );
}

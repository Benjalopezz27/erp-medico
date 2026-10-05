import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Decimal from 'decimal.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/features/products/utils/products.math';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useCloseCashRegisterMutation } from '../hooks/use-cash-register';
import { cashDifference, isValidBalance, normalizeBalance } from '../utils/cash-register.math';

export function CloseCashForm({ expectedBalance }: { expectedBalance: string }) {
  const [actual, setActual] = useState('');
  const [observation, setObservation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useCloseCashRegisterMutation();
  const difference = cashDifference(actual, expectedBalance);
  const hasDifference = difference !== null && !new Decimal(difference).isZero();

  const submit = () => {
    if (difference === null) {
      setError('Ingrese un saldo contado válido (0 o más, hasta 2 decimales).');
      return;
    }
    if (hasDifference && !observation.trim()) {
      setError('La observación es obligatoria cuando hay diferencia.');
      return;
    }
    setError(null);
    mutation.mutate({
      actualBalance: normalizeBalance(actual),
      ...(observation.trim() ? { observation: observation.trim() } : {}),
    });
  };

  return (
    <section className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Arqueo de caja</h2>
      <p className="text-xs text-slate-500">
        Saldo esperado:{' '}
        <span className="font-mono font-semibold">{formatCurrency(expectedBalance)}</span>
      </p>
      <label className="block space-y-1 text-xs font-semibold">
        Saldo contado
        <Input
          aria-label="Saldo contado"
          inputMode="decimal"
          className="font-mono"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
      </label>
      <p className="text-xs">
        Diferencia:{' '}
        <span
          data-testid="difference"
          className={`font-mono font-semibold ${hasDifference ? 'text-rose-700' : ''}`}
        >
          {difference === null || !isValidBalance(actual) ? '—' : formatCurrency(difference)}
        </span>
      </p>
      <label className="block space-y-1 text-xs font-semibold">
        Observación
        <Input
          aria-label="Observación"
          value={observation}
          maxLength={500}
          onChange={(e) => setObservation(e.target.value)}
        />
      </label>
      {(error || mutation.isError) && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? parseApiError(mutation.error).message}
        </p>
      )}
      <Button onClick={submit} disabled={mutation.isPending}>
        {mutation.isPending ? 'Cerrando…' : 'Cerrar y registrar arqueo'}
      </Button>
    </section>
  );
}

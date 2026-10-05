import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useOpenCashRegisterMutation } from '../hooks/use-cash-register';
import { isValidBalance, normalizeBalance } from '../utils/cash-register.math';

export function OpenCashForm() {
  const [balance, setBalance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useOpenCashRegisterMutation();

  const submit = () => {
    if (!isValidBalance(balance)) {
      setError('Ingrese un monto válido (0 o más, hasta 2 decimales).');
      return;
    }
    setError(null);
    mutation.mutate({ openingBalance: normalizeBalance(balance) });
  };

  return (
    <section className="max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Apertura de caja</h2>
      <label className="block space-y-1 text-xs font-semibold">
        Saldo inicial
        <Input
          aria-label="Saldo inicial"
          inputMode="decimal"
          className="font-mono"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </label>
      {(error || mutation.isError) && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {error ?? parseApiError(mutation.error).message}
        </p>
      )}
      <Button onClick={submit} disabled={mutation.isPending}>
        {mutation.isPending ? 'Abriendo…' : 'Abrir caja'}
      </Button>
    </section>
  );
}

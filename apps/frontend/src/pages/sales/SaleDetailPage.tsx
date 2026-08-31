import { useParams } from '@tanstack/react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaleDetailView } from '@/features/sales/components/SaleDetailView';
import { useSaleDetailQuery } from '@/features/sales/hooks/use-sales-query';
import { parseSalesError } from '@/features/sales/utils/sales.errors';

export function SaleDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const query = useSaleDetailQuery(id);
  if (query.isLoading)
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando venta…
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"
      >
        <p className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {parseSalesError(query.error).message}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          className="mt-3"
        >
          Reintentar
        </Button>
      </div>
    );
  return <SaleDetailView sale={query.data} />;
}

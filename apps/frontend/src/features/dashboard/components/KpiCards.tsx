import { Link } from '@tanstack/react-router';
import { AlertTriangle, FileWarning, Landmark, TrendingUp, Wallet } from 'lucide-react';
import { SupplierInvoiceStatus } from '@erp/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/features/products/utils/products.math';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useDashboardKpisQuery } from '../hooks/use-dashboard-kpis';

function KpiCard({
  title,
  value,
  hint,
  icon,
  link,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  link: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm transition hover:border-slate-400">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </CardTitle>
        <div className="rounded-lg bg-slate-50 p-2 text-slate-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
        {link}
      </CardContent>
    </Card>
  );
}

const linkClass = 'mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline';

export function KpiCards() {
  const { data, isError, error } = useDashboardKpisQuery();

  if (isError) {
    return (
      <p role="alert" className="text-xs text-rose-700">
        {parseApiError(error).message}
      </p>
    );
  }
  const n = (value?: number) => (value === undefined ? '—' : String(value));
  const money = (value?: string) => (value === undefined ? '—' : formatCurrency(value));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        title="Ventas del día"
        value={money(data?.salesToday)}
        hint="Ventas confirmadas hoy"
        icon={<TrendingUp className="h-4 w-4" />}
        link={
          <Link to="/sales" className={linkClass}>
            Ver ventas
          </Link>
        }
      />
      <KpiCard
        title="Ventas del mes"
        value={money(data?.salesMonth)}
        hint="Ventas confirmadas en el mes"
        icon={<Wallet className="h-4 w-4" />}
        link={
          <Link to="/sales" className={linkClass}>
            Ver ventas
          </Link>
        }
      />
      <KpiCard
        title="Bajo mínimo"
        value={n(data?.lowStockProducts)}
        hint="Productos con stock en o bajo el mínimo"
        icon={<AlertTriangle className="h-4 w-4" />}
        link={
          <Link to="/stock" className={linkClass}>
            Ver stock
          </Link>
        }
      />
      <KpiCard
        title="Facturas observadas"
        value={n(data?.observedSupplierInvoices)}
        hint="Facturas de proveedor a resolver"
        icon={<FileWarning className="h-4 w-4" />}
        link={
          <Link
            to="/purchases/supplier-invoices"
            search={{ status: SupplierInvoiceStatus.OBSERVADA } as never}
            className={linkClass}
          >
            Ver facturas
          </Link>
        }
      />
      <KpiCard
        title="Cheques a vencer"
        value={n(data?.checksDueSoon)}
        hint="Vencen en los próximos 7 días"
        icon={<Landmark className="h-4 w-4" />}
        link={
          <Link to="/treasury/checks" className={linkClass}>
            Ver cheques
          </Link>
        }
      />
    </div>
  );
}

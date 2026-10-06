import { useState, type ElementType } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock,
  Landmark,
  Receipt,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { DashboardActivityType, type IDashboardActivityItem } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useDashboardActivityQuery } from '../hooks/use-dashboard-activity';
import { formatCurrency } from '@/lib/money';

const ICONS: Record<DashboardActivityType, { icon: ElementType; className: string }> = {
  [DashboardActivityType.SALE_CONFIRMED]: {
    icon: ShoppingCart,
    className: 'bg-blue-50 text-blue-600',
  },
  [DashboardActivityType.SALE_CANCELLED]: { icon: XCircle, className: 'bg-rose-50 text-rose-600' },
  [DashboardActivityType.STOCK_MOVEMENT]: { icon: Boxes, className: 'bg-amber-50 text-amber-600' },
  [DashboardActivityType.PAYMENT_RECEIVED]: {
    icon: Receipt,
    className: 'bg-emerald-50 text-emerald-600',
  },
  [DashboardActivityType.TREASURY_MOVEMENT]: {
    icon: Landmark,
    className: 'bg-indigo-50 text-indigo-600',
  },
};

const PAGE_SIZE = 5;

const rtf = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'hace un momento';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day');
  return new Date(iso).toLocaleDateString('es-AR');
}

function ActivityRow({ item }: { item: IDashboardActivityItem }) {
  const { icon: Icon, className } = ICONS[item.type];
  return (
    <li>
      <Link
        to={item.link.to as never}
        params={item.link.params as never}
        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
      >
        <span className={`shrink-0 rounded-xl p-2 ${className}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
          <span className="block truncate text-xs text-slate-500">
            {item.detail}
            {item.userName ? ` · ${item.userName}` : ''}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {item.amount !== null && (
            <span className="block text-sm font-semibold text-slate-900">
              {formatCurrency(item.amount)}
            </span>
          )}
          <time dateTime={item.occurredAt} className="block text-[11px] text-slate-400">
            {formatRelativeTime(item.occurredAt)}
          </time>
        </span>
      </Link>
    </li>
  );
}

export function ActivityFeed() {
  const { data, isPending, isError, error, refetch } = useDashboardActivityQuery();
  const [page, setPage] = useState(1);

  if (isPending) {
    return (
      <div role="status" aria-label="Cargando actividad" className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="space-y-3 py-6 text-center">
        <p className="text-sm text-rose-700">{parseApiError(error).message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="space-y-2 py-8 text-center text-slate-400">
        <Clock className="mx-auto h-8 w-8 text-slate-300" />
        <p className="text-sm">No hay actividad reciente</p>
      </div>
    );
  }
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const current = Math.min(page, totalPages);
  const visible = data.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100">
        {visible.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>
      {totalPages > 1 && (
        <nav aria-label="Paginación de actividad" className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Página {current} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}

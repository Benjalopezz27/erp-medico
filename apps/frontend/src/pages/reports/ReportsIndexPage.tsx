import { Link } from '@tanstack/react-router';
import { REPORT_CONFIGS } from '@/features/reports/report-configs';

export function ReportsIndexPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-xs text-slate-500">Elija un reporte para verlo y exportarlo.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CONFIGS.map((c) => (
          <Link
            key={c.type}
            to="/reports/$type"
            params={{ type: c.type }}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <h2 className="text-sm font-semibold text-slate-900">{c.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

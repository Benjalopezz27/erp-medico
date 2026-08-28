import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, Info, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { MarkupLevel } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { MarkupDeleteModal } from '@/features/prices/components/MarkupDeleteModal';
import { MarkupFormModal } from '@/features/prices/components/MarkupFormModal';
import { MarkupSimulator } from '@/features/prices/components/MarkupSimulator';
import { MarkupsList } from '@/features/prices/components/MarkupsList';
import { useMarkupsQuery } from '@/features/prices/hooks/use-markups-query';
import type { IMarkupConfiguration } from '@/features/prices/types/markups.types';
import { parseMarkupError } from '@/features/prices/utils/markups.errors';

export function MarkupsPage() {
  const query = useMarkupsQuery();
  const categoriesQuery = useCategoriesQuery();
  const [formLevel, setFormLevel] = useState<MarkupLevel>();
  const [editing, setEditing] = useState<IMarkupConfiguration | null>(null);
  const [deleting, setDeleting] = useState<IMarkupConfiguration | null>(null);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const configurations = query.data ?? [];
  const openCreate = (level: MarkupLevel) => {
    setEditing(null);
    setFormLevel(level);
  };
  const openEdit = (configuration: IMarkupConfiguration) => {
    setEditing(configuration);
    setFormLevel(configuration.level);
  };
  const refresh = () => {
    void query.refetch();
    void categoriesQuery.refetch();
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-200">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Link
          to="/settings"
          className="mb-3 inline-flex items-center text-xs font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver a Configuración
        </Link>
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-700">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configuración de markups</h1>
            <p className="mt-1 text-xs text-slate-500">
              Administre la base global y las excepciones que determinan precios netos sugeridos.
            </p>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Prioridad: Producto → Categoría → Global.</strong> El primer nivel configurado es
          el efectivo. Los cambios recalculan sugerencias, pero nunca modifican automáticamente el
          precio activo.
        </p>
      </div>
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {notice}
          </span>
          <button aria-label="Cerrar notificación" onClick={() => setNotice(undefined)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <MarkupSimulator />

      {query.isLoading ? (
        <div aria-label="Cargando configuraciones de markup" className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
        >
          <p>{parseMarkupError(query.error).message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Reintentar
          </Button>
        </div>
      ) : (
        <MarkupsList
          configurations={configurations}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      {categoriesQuery.isError && (
        <div role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          No se pudieron cargar las categorías. Actualice antes de crear una excepción por
          categoría.
        </div>
      )}

      {formLevel && (
        <MarkupFormModal
          isOpen
          level={formLevel}
          configuration={editing}
          configurations={configurations}
          categories={categoriesQuery.data ?? []}
          onClose={() => {
            setFormLevel(undefined);
            setEditing(null);
          }}
          onSuccess={setNotice}
          onRefresh={refresh}
        />
      )}
      <MarkupDeleteModal
        configuration={deleting}
        onClose={() => setDeleting(null)}
        onSuccess={setNotice}
        onRefresh={refresh}
      />
    </main>
  );
}

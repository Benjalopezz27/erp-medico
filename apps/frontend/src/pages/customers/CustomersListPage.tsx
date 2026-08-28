import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RotateCcw, Users } from 'lucide-react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { UserRole } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { CustomerFilters } from '@/features/customers/components/CustomerFilters';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { CustomerLifecycleModal } from '@/features/customers/components/CustomerLifecycleModal';
import { CustomerPagination } from '@/features/customers/components/CustomerPagination';
import { CustomerTable } from '@/features/customers/components/CustomerTable';
import { useCustomersQuery } from '@/features/customers/hooks/use-customers-query';
import type {
  CustomerSearchParams,
  ICustomer,
  TaxCondition,
} from '@/features/customers/types/customers.types';
import { parseCustomerError } from '@/features/customers/utils/customers.errors';

export function CustomersListPage() {
  const navigate = useNavigate({ from: '/customers' });
  const search = useSearch({ strict: false }) as CustomerSearchParams;
  const isAdmin = useAuthStore((state) => state.user?.role === UserRole.ADMINISTRADOR);
  const query = useCustomersQuery(search);
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; customer: ICustomer | null } | null>(
    null,
  );
  const [lifecycleCustomer, setLifecycleCustomer] = useState<ICustomer | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data || query.isPlaceholderData) return;
    if ((search.page ?? 1) > query.data.meta.totalPages) {
      navigate({
        search: (previous) => ({ ...previous, page: query.data!.meta.totalPages }),
        replace: true,
      });
    }
  }, [navigate, query.data, query.isPlaceholderData, search.page]);

  const updateSearch = useCallback(
    (values: Partial<CustomerSearchParams>) => {
      navigate({ to: '/customers', search: (previous) => ({ ...previous, ...values }) });
    },
    [navigate],
  );
  const handleSearch = useCallback(
    (value?: string) => updateSearch({ search: value, page: 1 }),
    [updateSearch],
  );
  const handleTax = useCallback(
    (value?: TaxCondition) => updateSearch({ taxCondition: value, page: 1 }),
    [updateSearch],
  );
  const handleStatus = useCallback(
    (value: boolean) => updateSearch({ isActive: value, page: 1 }),
    [updateSearch],
  );
  const resetFilters = useCallback(
    () =>
      navigate({
        to: '/customers',
        search: { page: 1, limit: search.limit ?? 10, isActive: true },
      }),
    [navigate, search.limit],
  );

  const filtered = Boolean(search.search || search.taxCondition || search.isActive === false);
  return (
    <main className="mx-auto max-w-7xl space-y-4 animate-in fade-in duration-200">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Gestión de clientes
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Identidad fiscal, contacto y límites comerciales autorizados
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setFeedback(null);
            setForm({ mode: 'create', customer: null });
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo cliente
        </Button>
      </header>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {feedback}
          </span>
          <button type="button" aria-label="Cerrar notificación" onClick={() => setFeedback(null)}>
            ✕
          </button>
        </div>
      )}

      <CustomerFilters
        search={search.search}
        taxCondition={search.taxCondition}
        isActive={search.isActive}
        onSearchChange={handleSearch}
        onTaxConditionChange={handleTax}
        onStatusChange={handleStatus}
        onReset={resetFilters}
      />

      {query.isError ? (
        <section
          role="alert"
          className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-800"
        >
          <AlertCircle className="mx-auto h-8 w-8" />
          <div>
            <h2 className="font-semibold">No se pudieron cargar los clientes</h2>
            <p className="mt-1 text-xs">{parseCustomerError(query.error).message}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reintentar
          </Button>
        </section>
      ) : !query.isPending && query.data?.data.length === 0 ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <div>
            <h2 className="font-semibold">No se encontraron clientes</h2>
            <p className="mt-1 text-xs text-slate-500">
              {filtered
                ? 'No hay resultados para los filtros aplicados.'
                : 'Todavía no hay clientes registrados.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={filtered ? 'outline' : 'default'}
            onClick={filtered ? resetFilters : () => setForm({ mode: 'create', customer: null })}
          >
            {filtered ? 'Limpiar filtros' : 'Crear primer cliente'}
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
          <CustomerTable
            customers={query.data?.data ?? []}
            isPending={query.isPending}
            isFetching={query.isFetching}
            isAdmin={isAdmin}
            onEdit={(customer) => setForm({ mode: 'edit', customer })}
            onLifecycle={setLifecycleCustomer}
          />
          {query.data && (
            <CustomerPagination
              meta={query.data.meta}
              disabled={query.isFetching}
              onPageChange={(page) => updateSearch({ page })}
              onLimitChange={(limit) => updateSearch({ limit, page: 1 })}
            />
          )}
        </section>
      )}

      <CustomerFormModal
        isOpen={Boolean(form)}
        mode={form?.mode ?? 'create'}
        customer={form?.customer ?? null}
        onClose={() => setForm(null)}
        onSuccess={(customer) =>
          setFeedback(
            `${customer.businessName} fue ${form?.mode === 'edit' ? 'actualizado' : 'creado'} correctamente.`,
          )
        }
      />
      <CustomerLifecycleModal
        customer={lifecycleCustomer}
        isOpen={Boolean(lifecycleCustomer)}
        onClose={() => setLifecycleCustomer(null)}
        onSuccess={(customer) =>
          setFeedback(
            `${customer.businessName} fue ${customer.isActive ? 'reactivado' : 'desactivado'} correctamente.`,
          )
        }
      />
    </main>
  );
}

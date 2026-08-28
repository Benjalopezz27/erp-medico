import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { Link, useParams } from '@tanstack/react-router';
import { UserRole } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerContactLinks } from '@/features/customers/components/CustomerContactLinks';
import {
  CustomerDocumentBadge,
  CustomerStatusBadge,
  CustomerTaxConditionBadge,
} from '@/features/customers/components/CustomerBadges';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { CustomerLifecycleModal } from '@/features/customers/components/CustomerLifecycleModal';
import { useCustomerDetailQuery } from '@/features/customers/hooks/use-customers-query';
import { parseCustomerError } from '@/features/customers/utils/customers.errors';
import { formatCurrency } from '@/features/products/utils/products.math';
import { useAuthStore } from '@/stores/authStore';

export function CustomerDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const query = useCustomerDetailQuery(id);
  const isAdmin = useAuthStore((state) => state.user?.role === UserRole.ADMINISTRADOR);
  const [tab, setTab] = useState('information');
  const [editing, setEditing] = useState(false);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const customer = query.data;
  if (query.isPending)
    return (
      <div aria-label="Cargando cliente" className="mx-auto max-w-5xl space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-80 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  if (query.isError || !customer)
    return (
      <section
        role="alert"
        className="mx-auto max-w-3xl space-y-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-800"
      >
        <AlertCircle className="mx-auto h-8 w-8" />
        <h1 className="font-semibold">No se pudo cargar el cliente</h1>
        <p className="text-xs">{parseCustomerError(query.error).message}</p>
        <div className="flex justify-center gap-2">
          <Link to="/customers" search={{ page: 1, limit: 10, isActive: true }}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <Button size="sm" onClick={() => void query.refetch()}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </section>
    );
  return (
    <main className="mx-auto max-w-5xl space-y-4 animate-in fade-in duration-200">
      <Link
        to="/customers"
        search={{ page: 1, limit: 10, isActive: customer.isActive }}
        className="inline-flex items-center text-xs font-medium text-blue-600 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Volver a clientes
      </Link>
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{customer.businessName}</h1>
              <CustomerStatusBadge isActive={customer.isActive} />
            </div>
            <CustomerDocumentBadge type={customer.documentType} value={customer.cuitOrDni} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
          {isAdmin && (
            <Button
              type="button"
              variant={customer.isActive ? 'destructive' : 'default'}
              size="sm"
              onClick={() => setLifecycleOpen(true)}
            >
              {customer.isActive ? (
                <PowerOff className="mr-1.5 h-4 w-4" />
              ) : (
                <Power className="mr-1.5 h-4 w-4" />
              )}
              {customer.isActive ? 'Desactivar' : 'Reactivar'}
            </Button>
          )}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="information">Información</TabsTrigger>
          <TabsTrigger value="special-prices" disabled title="Disponible en US24-B">
            Precios especiales · Próximamente
          </TabsTrigger>
        </TabsList>
        <TabsContent value="information" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <InfoRow label="Documento">
                  <CustomerDocumentBadge type={customer.documentType} value={customer.cuitOrDni} />
                </InfoRow>
                <InfoRow label="Condición fiscal">
                  <CustomerTaxConditionBadge value={customer.taxCondition} />
                </InfoRow>
                <InfoRow label="Estado">
                  <CustomerStatusBadge isActive={customer.isActive} />
                </InfoRow>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contacto</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerContactLinks
                  email={customer.email}
                  phone={customer.phone}
                  address={customer.address}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Condición comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">Límite de crédito autorizado</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrency(customer.creditLimit)}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <strong>No es un saldo ni crédito disponible.</strong> La cuenta corriente,
                movimientos y cobranzas estarán disponibles en Sprint 9.
              </div>
            </CardContent>
          </Card>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            Última actualización: {new Date(customer.updatedAt).toLocaleString('es-AR')}
          </p>
        </TabsContent>
      </Tabs>
      <CustomerFormModal
        isOpen={editing}
        mode="edit"
        customer={customer}
        onClose={() => setEditing(false)}
        onSuccess={() => setEditing(false)}
      />
      <CustomerLifecycleModal
        isOpen={lifecycleOpen}
        customer={customer}
        onClose={() => setLifecycleOpen(false)}
        onSuccess={() => setLifecycleOpen(false)}
      />
    </main>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}

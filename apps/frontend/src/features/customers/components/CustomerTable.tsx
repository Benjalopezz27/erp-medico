import { Eye, Pencil, Power, PowerOff } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import type { ICustomer } from '../types/customers.types';
import { CustomerContactLinks } from './CustomerContactLinks';
import {
  CustomerDocumentBadge,
  CustomerStatusBadge,
  CustomerTaxConditionBadge,
} from './CustomerBadges';
import { formatCurrency } from '@/features/products/utils/products.math';

export function CustomerTable({
  customers,
  isPending,
  isFetching,
  isAdmin,
  mutatingId,
  onEdit,
  onLifecycle,
}: {
  customers: ICustomer[];
  isPending: boolean;
  isFetching: boolean;
  isAdmin: boolean;
  mutatingId?: string | null;
  onEdit: (customer: ICustomer) => void;
  onLifecycle: (customer: ICustomer) => void;
}) {
  if (isPending) {
    return (
      <div aria-label="Cargando clientes" className="space-y-2 bg-white p-4 dark:bg-slate-900">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900">
      <table className={`w-full min-w-[960px] text-left text-xs ${isFetching ? 'opacity-70' : ''}`}>
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <tr>
            <th scope="col" className="px-4 py-3">
              Cliente
            </th>
            <th scope="col" className="px-4 py-3">
              Documento
            </th>
            <th scope="col" className="px-4 py-3">
              Condición fiscal
            </th>
            <th scope="col" className="px-4 py-3">
              Contacto
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Límite autorizado
            </th>
            <th scope="col" className="px-4 py-3">
              Estado
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                {customer.businessName}
              </td>
              <td className="px-4 py-3">
                <CustomerDocumentBadge type={customer.documentType} value={customer.cuitOrDni} />
              </td>
              <td className="px-4 py-3">
                <CustomerTaxConditionBadge value={customer.taxCondition} />
              </td>
              <td className="max-w-[220px] px-4 py-3">
                <CustomerContactLinks email={customer.email} phone={customer.phone} />
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency(customer.creditLimit)}
              </td>
              <td className="px-4 py-3">
                <CustomerStatusBadge isActive={customer.isActive} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Link
                    to="/customers/$id"
                    params={{ id: customer.id }}
                    aria-label={`Ver detalle de ${customer.businessName}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-slate-800"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${customer.businessName}`}
                    onClick={() => onEdit(customer)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={mutatingId === customer.id}
                      aria-label={`${customer.isActive ? 'Desactivar' : 'Reactivar'} ${customer.businessName}`}
                      onClick={() => onLifecycle(customer)}
                    >
                      {customer.isActive ? (
                        <PowerOff className="h-4 w-4 text-red-600" />
                      ) : (
                        <Power className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

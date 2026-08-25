import React from 'react';
import { Edit2, Ban, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCuit } from '@erp/shared-types';
import { SupplierStatusBadge } from './SupplierStatusBadge';
import { SupplierTaxConditionBadge } from './SupplierTaxConditionBadge';
import { SupplierContactLinks } from './SupplierContactLinks';
import type { ISupplier } from '../types/suppliers.types';

export interface SupplierTableProps {
  suppliers: ISupplier[];
  isPending: boolean;
  isFetching?: boolean;
  onEditSupplier: (supplier: ISupplier) => void;
  onDeactivateSupplier: (supplier: ISupplier) => void;
  onReactivateSupplier: (supplier: ISupplier) => void;
  mutatingSupplierId?: string | null;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  isPending,
  isFetching = false,
  onEditSupplier,
  onDeactivateSupplier,
  onReactivateSupplier,
  mutatingSupplierId,
}) => {
  if (isPending) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse hidden sm:block" />
              <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse hidden md:block" />
              <div className="h-7 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm relative">
      {/* Background Refetch Indicator */}
      {isFetching && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/90 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Actualizando...</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wider">
              <th className="py-3.5 px-4">Proveedor</th>
              <th className="py-3.5 px-4">CUIT</th>
              <th className="py-3.5 px-4">Condición Fiscal</th>
              <th className="py-3.5 px-4">Contacto</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Dirección</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {suppliers.map((supplier) => {
              const isMutating = mutatingSupplierId === supplier.id;

              return (
                <tr
                  key={supplier.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                    !supplier.isActive ? 'bg-slate-50/30 dark:bg-slate-900/30' : ''
                  }`}
                >
                  {/* Razón Social */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-[280px]">
                          {supplier.businessName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CUIT */}
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                    {formatCuit(supplier.cuit)}
                  </td>

                  {/* Condición Fiscal */}
                  <td className="py-3.5 px-4">
                    <SupplierTaxConditionBadge taxCondition={supplier.taxCondition} />
                  </td>

                  {/* Contacto */}
                  <td className="py-3.5 px-4">
                    <SupplierContactLinks
                      email={supplier.email}
                      phone={supplier.phone}
                      whatsapp={supplier.whatsapp}
                    />
                  </td>

                  {/* Dirección */}
                  <td className="py-3.5 px-4 hidden lg:table-cell text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                    {supplier.address || '-'}
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-4">
                    <SupplierStatusBadge isActive={supplier.isActive} />
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSupplier(supplier)}
                        disabled={isMutating}
                        className="h-8 px-2 text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        title="Editar datos del proveedor"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>

                      {supplier.isActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivateSupplier(supplier)}
                          disabled={isMutating}
                          className="h-8 px-2 text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Desactivar proveedor"
                        >
                          {isMutating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5 mr-1" />
                              Desactivar
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onReactivateSupplier(supplier)}
                          disabled={isMutating}
                          className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          title="Reactivar proveedor"
                        >
                          {isMutating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Reactivar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

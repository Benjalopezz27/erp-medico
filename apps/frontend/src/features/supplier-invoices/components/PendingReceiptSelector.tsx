import { useEffect, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PurchaseOrderPagination } from '@/features/purchase-orders/components/PurchaseOrderPagination';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import { usePendingInvoiceReceiptsQuery } from '../hooks/use-supplier-invoices';
import type { IPendingInvoiceReceipt } from '../types/supplier-invoices.types';
import { parseSupplierInvoiceError } from '../utils/supplier-invoices.errors';

export function PendingReceiptSelector({
  onSelect,
}: {
  onSelect: (receipt: IPendingInvoiceReceipt) => void;
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [supplierId, setSupplierId] = useState<string>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string>();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim() || undefined);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const query = usePendingInvoiceReceiptsQuery({ page, limit, supplierId, search });
  const suppliers = useSuppliersQuery({
    page: 1,
    limit: 100,
    sortBy: 'businessName',
    sortOrder: 'ASC',
  });

  return (
    <section className="space-y-4" aria-labelledby="pending-receipts-title">
      <div>
        <h2 id="pending-receipts-title" className="text-lg font-semibold">
          Seleccione una recepción
        </h2>
        <p className="text-xs text-slate-500">
          Solo se muestran recepciones con cantidades disponibles para facturar.
        </p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-9"
            placeholder="Recepción, remito, OC, proveedor, producto o SKU"
            aria-label="Buscar recepciones"
          />
        </div>
        <Select
          value={supplierId ?? ''}
          onChange={(event) => {
            setSupplierId(event.target.value || undefined);
            setPage(1);
          }}
          aria-label="Filtrar recepciones por proveedor"
        >
          <option value="">Todos los proveedores</option>
          {suppliers.data?.data.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.businessName}
            </option>
          ))}
        </Select>
      </div>
      {query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {parseSupplierInvoiceError(query.error).message}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : query.isLoading ? (
        <div aria-label="Cargando recepciones" className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : !query.data?.data.length ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="font-semibold">No hay recepciones pendientes</h3>
          <p className="text-xs text-slate-500">
            {search || supplierId
              ? 'No hay coincidencias con los filtros seleccionados.'
              : 'Todas las recepciones fueron facturadas completamente.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Recepción / remito</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Pendientes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {query.data.data.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="px-4 py-3">
                      <strong className="font-mono">{receipt.receiptNumber}</strong>
                      <p className="text-slate-500">Remito {receipt.deliveryNoteNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <strong>{receipt.supplier.businessName}</strong>
                      <p className="font-mono text-[10px] text-slate-400">
                        {receipt.supplier.cuit}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono">{receipt.purchaseOrder.orderNumber}</td>
                    <td className="px-4 py-3">
                      {new Intl.DateTimeFormat('es-AR').format(new Date(receipt.createdAt))}
                    </td>
                    <td className="px-4 py-3">{receipt.pendingLineCount} línea(s)</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => onSelect(receipt)}>
                        Seleccionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PurchaseOrderPagination
            {...query.data.meta}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      )}
    </section>
  );
}

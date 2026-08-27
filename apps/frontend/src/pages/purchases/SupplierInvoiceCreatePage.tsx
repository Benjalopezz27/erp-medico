import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PendingReceiptSelector } from '@/features/supplier-invoices/components/PendingReceiptSelector';
import { SupplierInvoiceForm } from '@/features/supplier-invoices/components/SupplierInvoiceForm';
import { getPendingInvoiceReceiptsApi } from '@/features/supplier-invoices/api/supplier-invoices.api';
import type { IPendingInvoiceReceipt } from '@/features/supplier-invoices/types/supplier-invoices.types';

export function SupplierInvoiceCreatePage() {
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<IPendingInvoiceReceipt | null>(null);

  const refreshSelected = async (): Promise<IPendingInvoiceReceipt | null> => {
    if (!receipt) return null;
    const response = await getPendingInvoiceReceiptsApi({
      page: 1,
      limit: 100,
      supplierId: receipt.supplier.id,
      search: receipt.receiptNumber,
    });
    return response.data.find((candidate) => candidate.id === receipt.id) ?? null;
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-1 text-xs text-slate-400">
            <Link to="/purchases/supplier-invoices">Facturas de proveedores</Link> / Nueva
          </nav>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold">Registrar factura de proveedor</h1>
          </div>
          <p className="text-xs text-slate-500">
            Seleccione una recepción y concilie las cantidades e importes del comprobante.
          </p>
        </div>
        <Link to="/purchases/supplier-invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
      </header>
      {receipt ? (
        <SupplierInvoiceForm
          key={receipt.id}
          receipt={receipt}
          onCreated={(invoice) =>
            navigate({
              to: '/purchases/supplier-invoices/$id',
              params: { id: invoice.id },
              replace: true,
            })
          }
          onChangeReceipt={() => setReceipt(null)}
          onRefreshReceipt={refreshSelected}
          onReceiptUpdated={setReceipt}
        />
      ) : (
        <PendingReceiptSelector onSelect={setReceipt} />
      )}
    </div>
  );
}

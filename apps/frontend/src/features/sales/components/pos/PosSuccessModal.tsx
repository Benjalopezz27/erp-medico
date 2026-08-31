import { Link } from '@tanstack/react-router';
import type { ISale } from '@erp/shared-types';
import { Modal } from '@/components/ui/modal';
import { Button, buttonVariants } from '@/components/ui/button';
import { formatCurrency } from '@/features/products/utils/products.math';

export function PosSuccessModal({
  sale,
  onNewSale,
}: {
  sale: ISale | null;
  onNewSale: () => void;
}) {
  return (
    <Modal
      isOpen={Boolean(sale)}
      onClose={onNewSale}
      title="Venta confirmada"
      description="Los siguientes importes fueron confirmados por el servidor."
      showCloseButton={false}
    >
      {sale && (
        <div className="space-y-5">
          <div className="rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-xs text-emerald-700">Número de venta</p>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-900">{sale.saleNumber}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-800">
              Total definitivo: {formatCurrency(sale.totalGross)}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onNewSale}>
              Nueva venta
            </Button>
            <Link
              to="/sales/$id"
              params={{ id: sale.id }}
              className={buttonVariants({ className: 'bg-blue-600 text-white hover:bg-blue-700' })}
            >
              Ver detalle
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

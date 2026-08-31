import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { SaleStatus, type ISale, type ISaleReturn } from '@erp/shared-types';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { calculateRemainingQuantities } from '../../utils/sales-returns-math.utils';
import { SaleReturnModal } from './SaleReturnModal';
import { SaleReturnsHistoryTable } from './SaleReturnsHistoryTable';

interface SaleReturnsSectionProps {
  sale: ISale;
  returnsQuery: UseQueryResult<ISaleReturn[]>;
}

export const SaleReturnsSection: React.FC<SaleReturnsSectionProps> = ({ sale, returnsQuery }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const returns = returnsQuery.data ?? [];
  const isConfirmed = sale.status === SaleStatus.CONFIRMADA;
  const remainingLines = calculateRemainingQuantities(sale, returns);
  const allFullyReturned = remainingLines.every((line) => line.remainingQuantity <= 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-slate-500" />
            Devoluciones
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Historial de devoluciones y control de calidad por producto.
          </p>
        </div>

        {isConfirmed ? (
          <Button
            type="button"
            size="sm"
            disabled={allFullyReturned}
            onClick={() => setIsModalOpen(true)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {allFullyReturned ? 'Venta totalmente devuelta' : 'Registrar devolución'}
          </Button>
        ) : (
          <span className="text-xs text-slate-400 italic">
            Sólo las ventas confirmadas admiten devoluciones.
          </span>
        )}
      </div>

      <SaleReturnsHistoryTable
        sale={sale}
        returns={returns}
        isLoading={returnsQuery.isLoading}
        isError={returnsQuery.isError}
        onRetry={() => returnsQuery.refetch()}
      />

      {isConfirmed && (
        <SaleReturnModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          sale={sale}
          returns={returns}
          onRefetchSaleAndReturns={async () => {
            await returnsQuery.refetch();
          }}
        />
      )}
    </div>
  );
};

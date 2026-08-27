import React from 'react';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';
import { cn } from '@/lib/utils';

export interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus;
  className?: string;
}

const statusConfig: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  [PurchaseOrderStatus.BORRADOR]: {
    label: 'Borrador',
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  [PurchaseOrderStatus.EMITIDA]: {
    label: 'Emitida',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  },
  [PurchaseOrderStatus.PARCIAL]: {
    label: 'Parcial',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  },
  [PurchaseOrderStatus.COMPLETADA]: {
    label: 'Completada',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  },
  [PurchaseOrderStatus.CANCELADA]: {
    label: 'Cancelada',
    className:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  },
};

export const PurchaseOrderStatusBadge: React.FC<PurchaseOrderStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      data-testid="purchase-order-status-badge"
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
};

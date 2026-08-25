import React from 'react';
import {
  AlertTriangle,
  Trash2,
  Undo2,
  CheckCircle2,
} from 'lucide-react';
import { QuarantineStatus } from '../../types/quarantine.types';
import { cn } from '@/lib/utils';

interface QuarantineStatusBadgeProps {
  status: QuarantineStatus;
  className?: string;
}

export const QuarantineStatusBadge: React.FC<QuarantineStatusBadgeProps> = ({
  status,
  className,
}) => {
  switch (status) {
    case QuarantineStatus.EN_CUARENTENA:
      return (
        <span
          data-testid="quarantine-status-badge-pending"
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
            className,
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          EN CUARENTENA
        </span>
      );

    case QuarantineStatus.MERMA_CONFIRMADA:
      return (
        <span
          data-testid="quarantine-status-badge-merma"
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30',
            className,
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          MERMA CONFIRMADA
        </span>
      );

    case QuarantineStatus.DEVOLUCION_PROVEEDOR:
      return (
        <span
          data-testid="quarantine-status-badge-devolucion"
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
            className,
          )}
        >
          <Undo2 className="w-3.5 h-3.5" />
          DEVUELTO A PROVEEDOR
        </span>
      );

    case QuarantineStatus.REINGRESADO_STOCK:
      return (
        <span
          data-testid="quarantine-status-badge-reingreso"
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
            className,
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          REINGRESADO A STOCK
        </span>
      );

    default:
      return null;
  }
};

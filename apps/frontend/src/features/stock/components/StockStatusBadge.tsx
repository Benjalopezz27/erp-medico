import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StockStatus } from '../types/stock.types';

interface StockStatusBadgeProps {
  status: StockStatus;
  className?: string;
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case StockStatus.CRITICAL:
      return (
        <span
          data-testid="stock-status-critical"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Crítico</span>
        </span>
      );
    case StockStatus.LOW:
      return (
        <span
          data-testid="stock-status-low"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Bajo</span>
        </span>
      );
    case StockStatus.NORMAL:
    default:
      return (
        <span
          data-testid="stock-status-normal"
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Normal</span>
        </span>
      );
  }
};

import React from 'react';
import { Star } from 'lucide-react';

interface PrimarySupplierBadgeProps {
  isPrimary: boolean;
}

export const PrimarySupplierBadge: React.FC<PrimarySupplierBadgeProps> = ({ isPrimary }) => {
  if (!isPrimary) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        Secundario
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
      <Star className="w-3 h-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
      Habitual
    </span>
  );
};

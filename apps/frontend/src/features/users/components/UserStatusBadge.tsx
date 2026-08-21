import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UserStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ isActive, className }) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs px-2.5 py-0.5 inline-flex items-center gap-1.5',
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-500 border-slate-200',
        className,
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')}
      />
      <span>{isActive ? 'Activo' : 'Inactivo'}</span>
    </Badge>
  );
};

import React from 'react';
import { Shield } from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, className }) => {
  const isAdmin = role === UserRole.ADMINISTRADOR;

  return (
    <Badge
      variant={isAdmin ? 'default' : 'secondary'}
      className={cn(
        'font-medium text-xs px-2.5 py-0.5 inline-flex items-center gap-1.5',
        isAdmin
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80 shadow-none'
          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80',
        className,
      )}
    >
      {isAdmin && <Shield className="w-3.5 h-3.5" />}
      <span>{role}</span>
    </Badge>
  );
};

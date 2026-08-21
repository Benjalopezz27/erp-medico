import React from 'react';
import { Edit2, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import type { IUser } from '../types/users.types';

export interface UserTableProps {
  users: IUser[];
  isPending: boolean;
  isFetching?: boolean;
  currentUserId?: string;
  onEditUser: (user: IUser) => void;
  onDeactivateUser: (user: IUser) => void;
  onReactivateUser: (user: IUser) => void;
  mutatingUserId?: string | null;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isPending,
  isFetching = false,
  currentUserId,
  onEditUser,
  onDeactivateUser,
  onReactivateUser,
  mutatingUserId,
}) => {
  if (isPending) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-100 rounded animate-pulse hidden sm:block" />
              <div className="h-5 w-16 bg-slate-100 rounded animate-pulse hidden md:block" />
              <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative">
      {/* Background Refetch Indicator */}
      {isFetching && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden">
          <div className="w-full h-full bg-blue-600 animate-pulse" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Usuario</th>
              <th className="py-3 px-4 hidden sm:table-cell">Correo Electrónico</th>
              <th className="py-3 px-4">Rol</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 hidden md:table-cell">Fecha de Alta</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="font-semibold text-slate-700 text-sm">
                      No se encontraron usuarios
                    </p>
                    <p className="text-xs text-slate-400">
                      No hay registros que coincidan con los filtros aplicados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = currentUserId !== undefined && user.id === currentUserId;
                const isMutatingThis = mutatingUserId === user.id;

                const formattedDate = user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '-';

                return (
                  <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* User Name & Initial Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate sm:hidden">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4 hidden sm:table-cell font-mono text-slate-600">
                      {user.email}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <UserRoleBadge role={user.role} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <UserStatusBadge isActive={user.isActive} />
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 hidden md:table-cell text-slate-500 font-mono">
                      {formattedDate}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Action */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditUser(user)}
                          disabled={isMutatingThis}
                          className="h-7 px-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Editar usuario"
                          aria-label={`Editar a ${user.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>

                        {/* Self Account Badge vs Deactivate/Reactivate Action */}
                        {isSelf ? (
                          <Badge
                            variant="outline"
                            className="h-7 px-2 font-normal text-slate-500 bg-slate-50 border-slate-200"
                            title="No puedes desactivar tu propia cuenta"
                          >
                            <span>Tu cuenta</span>
                            <span className="sr-only">No puedes desactivar tu propia cuenta</span>
                          </Badge>
                        ) : user.isActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivateUser(user)}
                            disabled={isMutatingThis}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50"
                            title="Desactivar usuario"
                            aria-label={`Desactivar a ${user.name}`}
                          >
                            {isMutatingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5 mr-1" />
                                <span className="hidden sm:inline">Desactivar</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onReactivateUser(user)}
                            disabled={isMutatingThis}
                            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Reactivar usuario"
                            aria-label={`Reactivar a ${user.name}`}
                          >
                            {isMutatingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                <span className="hidden sm:inline">Reactivar</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

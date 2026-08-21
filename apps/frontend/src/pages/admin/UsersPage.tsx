import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { UserPlus, Users, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { UserFilters } from '@/features/users/components/UserFilters';
import { UserTable } from '@/features/users/components/UserTable';
import { UserPagination } from '@/features/users/components/UserPagination';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { UserDeactivateModal } from '@/features/users/components/UserDeactivateModal';
import { useUsersQuery } from '@/features/users/hooks/use-users-query';
import { useReactivateUserMutation } from '@/features/users/hooks/use-user-mutations';
import { parseUserApiError } from '@/features/users/utils/users.errors';
import type { IUser, UserSearchParams } from '@/features/users/types/users.types';

export const UsersPage: React.FC = () => {
  const navigate = useNavigate({ from: '/admin/users' });
  // This component is rendered directly by the users route. Reading the nearest
  // match avoids coupling the public URL to TanStack Router's internal route ID
  // (`/app/admin/users`, because the route lives below the pathless `app` layout).
  const searchParams = useSearch({ strict: false }) as UserSearchParams;
  const currentUserId = useAuthStore((state) => state.user?.id);

  // Modal & Mutation State
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    user: IUser | null;
  }>({
    isOpen: false,
    mode: 'create',
    user: null,
  });

  const [deactivateModal, setDeactivateModal] = useState<{
    isOpen: boolean;
    user: IUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Queries & Mutations
  const { data, isPending, isFetching, isError, error, isPlaceholderData, refetch } =
    useUsersQuery(searchParams);

  const reactivateMutation = useReactivateUserMutation();

  // Out-of-bounds page correction after fresh data arrival
  useEffect(() => {
    if (data && !isPlaceholderData && data.meta.totalPages > 0) {
      if (searchParams.page > data.meta.totalPages) {
        navigate({
          search: (prev) => ({
            ...prev,
            page: data.meta.totalPages,
          }),
          replace: true,
        });
      }
    }
  }, [data, isPlaceholderData, searchParams.page, navigate]);

  // URL Search Updater Helper
  const updateSearch = (updater: (prev: UserSearchParams) => Partial<UserSearchParams>) => {
    navigate({
      to: '/admin/users',
      search: (prev) => ({
        ...prev,
        ...updater(prev as UserSearchParams),
      }),
    });
  };

  // Filter Handlers (All reset page to 1)
  const handleSearchChange = (search?: string) => {
    updateSearch(() => ({ search, page: 1 }));
  };

  const handleRoleChange = (role?: UserSearchParams['role']) => {
    updateSearch(() => ({ role, page: 1 }));
  };

  const handleStatusChange = (isActive?: boolean) => {
    updateSearch(() => ({ isActive, page: 1 }));
  };

  const handleResetFilters = () => {
    navigate({
      to: '/admin/users',
      search: () => ({
        page: 1,
        limit: searchParams.limit || 10,
      }),
    });
  };

  const handlePageChange = (newPage: number) => {
    updateSearch(() => ({ page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    updateSearch(() => ({ limit: newLimit, page: 1 }));
  };

  // Action Handlers
  const handleOpenCreateModal = () => {
    setFeedback(null);
    setFormModal({ isOpen: true, mode: 'create', user: null });
  };

  const handleOpenEditModal = (user: IUser) => {
    setFeedback(null);
    setFormModal({ isOpen: true, mode: 'edit', user });
  };

  const handleOpenDeactivateModal = (user: IUser) => {
    setFeedback(null);
    setDeactivateModal({ isOpen: true, user });
  };

  const handleReactivate = async (user: IUser) => {
    setFeedback(null);
    setMutatingUserId(user.id);
    try {
      await reactivateMutation.mutateAsync(user.id);
      setFeedback({
        type: 'success',
        message: `El usuario "${user.name}" fue reactivado exitosamente.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: parseUserApiError(err),
      });
    } finally {
      setMutatingUserId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Administración de cuentas de acceso, roles y estados del sistema
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:no-underline ml-2"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Query Error State Banner */}
      {isError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">No se pudieron cargar los usuarios</p>
              <p className="mt-0.5">{parseUserApiError(error)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="bg-white border-red-300 text-red-700 hover:bg-red-50 text-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <UserFilters
        search={searchParams.search}
        role={searchParams.role}
        isActive={searchParams.isActive}
        onSearchChange={handleSearchChange}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        onResetFilters={handleResetFilters}
      />

      {/* User Table & Pagination */}
      <div className="space-y-0">
        <UserTable
          users={data?.data || []}
          isPending={isPending}
          isFetching={isFetching && !isPending}
          currentUserId={currentUserId}
          onEditUser={handleOpenEditModal}
          onDeactivateUser={handleOpenDeactivateModal}
          onReactivateUser={handleReactivate}
          mutatingUserId={mutatingUserId}
        />

        {data && data.meta && data.data.length > 0 && (
          <UserPagination
            meta={data.meta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            disabled={isFetching}
          />
        )}
      </div>

      {/* Create / Edit Form Modal */}
      <UserFormModal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, mode: 'create', user: null })}
        mode={formModal.mode}
        initialUser={formModal.user}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message:
              formModal.mode === 'create'
                ? 'Usuario creado exitosamente.'
                : 'Usuario actualizado exitosamente.',
          });
        }}
      />

      {/* Deactivate Confirmation Modal */}
      <UserDeactivateModal
        isOpen={deactivateModal.isOpen}
        onClose={() => setDeactivateModal({ isOpen: false, user: null })}
        user={deactivateModal.user}
        onSuccess={() => {
          setFeedback({
            type: 'success',
            message: `El usuario "${deactivateModal.user?.name}" fue desactivado exitosamente.`,
          });
        }}
      />
    </div>
  );
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IAuthSession, IAuthUser } from '@erp/shared-types';
import { UserRole } from '@erp/shared-types';

export { UserRole };
export type User = IAuthUser;

export interface AuthState {
  user: IAuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (session: IAuthSession) => void;
  clearSession: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

// Persistido a localStorage (bug #237): sin esto, F5 o abrir un link en
// pestaña nueva deslogueaba silenciosamente al usuario. Trade-off aceptado:
// el JWT queda expuesto a un XSS en el bundle — decisión de negocio, no hay
// refresh-token/cookie httpOnly en este backend todavía. El interceptor 401
// de apiClient sigue terminando la sesión si el token persistido expiró.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setSession: ({ user, accessToken }) =>
        set({
          user,
          token: accessToken,
          isAuthenticated: Boolean(accessToken && user),
        }),
      clearSession: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
      hasRole: (role: UserRole) => {
        const { user, isAuthenticated } = get();
        return isAuthenticated && user !== null && user.role === role;
      },
      hasAnyRole: (roles: UserRole[]) => {
        const { user, isAuthenticated } = get();
        return isAuthenticated && user !== null && roles.includes(user.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

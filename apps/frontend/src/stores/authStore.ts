import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set, get) => ({
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
}));

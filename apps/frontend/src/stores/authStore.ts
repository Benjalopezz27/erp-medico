import { create } from 'zustand';
import { UserRole, IUser } from '@erp/shared-types';

export { UserRole };
export type User = IUser;

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: '1',
    name: 'Juan Admin',
    email: 'admin@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  token: 'mock-jwt-token-sprint-0',
  isAuthenticated: true,
  login: (email: string, role: UserRole = UserRole.ADMINISTRADOR) =>
    set({
      user: {
        id: role === UserRole.ADMINISTRADOR ? '1' : '2',
        name: role === UserRole.ADMINISTRADOR ? 'Juan Admin' : 'Ana Ventas',
        email,
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      token: 'mock-jwt-token-sprint-0',
      isAuthenticated: true,
    }),
  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),
  switchRole: (role: UserRole) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            name: role === UserRole.ADMINISTRADOR ? 'Juan Admin' : 'Ana Ventas',
            role,
          }
        : {
            id: role === UserRole.ADMINISTRADOR ? '1' : '2',
            name: role === UserRole.ADMINISTRADOR ? 'Juan Admin' : 'Ana Ventas',
            email: role === UserRole.ADMINISTRADOR ? 'admin@erp.com' : 'vendedor@erp.com',
            role,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
      token: 'mock-jwt-token-sprint-0',
      isAuthenticated: true,
    })),
}));

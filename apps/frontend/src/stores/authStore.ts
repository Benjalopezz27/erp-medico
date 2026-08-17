import { create } from 'zustand';

export type UserRole = 'ADMINISTRADOR' | 'VENDEDOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

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
    role: 'ADMINISTRADOR',
  },
  token: 'mock-jwt-token-sprint-0',
  isAuthenticated: true,
  login: (email: string, role: UserRole = 'ADMINISTRADOR') =>
    set({
      user: {
        id: role === 'ADMINISTRADOR' ? '1' : '2',
        name: role === 'ADMINISTRADOR' ? 'Juan Admin' : 'Ana Ventas',
        email,
        role,
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
            name: role === 'ADMINISTRADOR' ? 'Juan Admin' : 'Ana Ventas',
            role,
          }
        : {
            id: role === 'ADMINISTRADOR' ? '1' : '2',
            name: role === 'ADMINISTRADOR' ? 'Juan Admin' : 'Ana Ventas',
            email: role === 'ADMINISTRADOR' ? 'admin@erp.com' : 'vendedor@erp.com',
            role,
          },
      token: 'mock-jwt-token-sprint-0',
      isAuthenticated: true,
    })),
}));

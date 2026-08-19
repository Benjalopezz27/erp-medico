import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { sessionTerminator } from './session-terminator';

export interface SessionManagerDependencies {
  queryClient: QueryClient;
  getCurrentPath: () => string;
  navigateToLogin: () => void | Promise<unknown>;
}

export function configureSessionManager({
  queryClient,
  getCurrentPath,
  navigateToLogin,
}: SessionManagerDependencies): () => void {
  return sessionTerminator.register(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    useAuthStore.getState().clearSession();
    if (getCurrentPath() !== '/login') await navigateToLogin();
  });
}

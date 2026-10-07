import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { queryClient } from '@/lib/query-client';
import { requireOnboarding, resetOnboardingCache } from './router';

const user = (role: UserRole) => ({
  id: 'u',
  name: 'n',
  email: 'e@e.com',
  role,
  isActive: true,
});
const status = (completed: boolean) => ({ completed, steps: [], pendingStep: 'fiscal' });

describe('requireOnboarding', () => {
  beforeEach(() => {
    resetOnboardingCache();
    queryClient.clear();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    useAuthStore.getState().setSession({ accessToken: 't', user: user(UserRole.ADMINISTRADOR) });
  });

  it('redirige al wizard si falta configuración', async () => {
    vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue(status(false));
    await expect(requireOnboarding('/sales')).rejects.toMatchObject({
      options: { to: '/onboarding' },
    });
  });

  it('no consulta en rutas del wizard', async () => {
    const spy = vi.spyOn(queryClient, 'fetchQuery');
    await requireOnboarding('/products/new');
    expect(spy).not.toHaveBeenCalled();
  });

  it('deja pasar y no vuelve a consultar una vez completo', async () => {
    const spy = vi.spyOn(queryClient, 'fetchQuery').mockResolvedValue(status(true));
    await requireOnboarding('/sales');
    await requireOnboarding('/sales');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no bloquea si la consulta falla', async () => {
    vi.spyOn(queryClient, 'fetchQuery').mockRejectedValue(new Error('net'));
    await expect(requireOnboarding('/sales')).resolves.toBeUndefined();
  });

  it('no consulta a un vendedor', async () => {
    useAuthStore.getState().setSession({ accessToken: 't', user: user(UserRole.VENDEDOR) });
    const spy = vi.spyOn(queryClient, 'fetchQuery');
    await requireOnboarding('/sales');
    expect(spy).not.toHaveBeenCalled();
  });
});

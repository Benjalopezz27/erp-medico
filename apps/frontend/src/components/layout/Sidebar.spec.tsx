import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { UserRole } from '@erp/shared-types';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';

function renderSidebar(role: UserRole) {
  useAuthStore.getState().setSession({
    accessToken: 'token',
    user: {
      id: 'user-id',
      name: 'Navigation User',
      email: 'navigation@erp.com',
      role,
      isActive: true,
    },
  });
  const router = createTestRouter(
    [{ path: '/', component: () => <Sidebar isOpen onClose={() => undefined} /> }],
    '/',
  );
  return renderWithRouter({ router });
}

describe('Sidebar permissions', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('hides administrative navigation from sellers but shows common and settings', async () => {
    renderSidebar(UserRole.VENDEDOR);

    expect(await screen.findByRole('link', { name: /productos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /compras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reportes/i })).not.toBeInTheDocument();
  });

  it('shows administrative navigation to administrators', async () => {
    renderSidebar(UserRole.ADMINISTRADOR);

    expect(await screen.findByRole('link', { name: /compras/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
  });
});

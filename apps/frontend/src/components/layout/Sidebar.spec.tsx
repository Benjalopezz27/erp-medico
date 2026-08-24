import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { UserRole } from '@erp/shared-types';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import {
  buildPaginatedStockResponse,
  buildStockOverviewItem,
} from '@/features/stock/testing/stock-fixtures';
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

describe('Sidebar permissions and badges', () => {
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

  it('renders low stock alert badge when alert count > 0', async () => {
    server.use(
      http.get('*/api/v1/stock/alerts', () => {
        return HttpResponse.json(
          buildPaginatedStockResponse([buildStockOverviewItem()], { total: 3 }),
        );
      }),
    );

    renderSidebar(UserRole.ADMINISTRADOR);

    const badge = await screen.findByTestId('stock-alerts-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });
});

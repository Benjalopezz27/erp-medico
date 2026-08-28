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

function renderSidebar(role: UserRole, path = '/') {
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
    [{ path, component: () => <Sidebar isOpen onClose={() => undefined} /> }],
    path,
  );
  return renderWithRouter({ router });
}

describe('Sidebar permissions and badges', () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    server.use(
      http.get('*/api/v1/price-reviews/pending-count', () => HttpResponse.json({ count: 0 })),
    );
  });

  it('hides administrative navigation from sellers but shows common and settings', async () => {
    renderSidebar(UserRole.VENDEDOR);

    expect(await screen.findByRole('link', { name: /productos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /compras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reportes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /revisión precios/i })).not.toBeInTheDocument();
  });

  it('shows administrative navigation to administrators', async () => {
    const { user } = renderSidebar(UserRole.ADMINISTRADOR);

    const supplyGroup = await screen.findByRole('button', { name: /abastecimiento/i });
    expect(supplyGroup).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /proveedores/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /importador/i })).not.toBeInTheDocument();

    await user.click(supplyGroup);
    expect(screen.getByRole('link', { name: /compras/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /proveedores/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /importador/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /administración/i }));
    expect(screen.getByRole('link', { name: /usuarios/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(supplyGroup).toHaveAttribute('aria-expanded', 'false');
  });

  it('automatically expands the group containing the active route', async () => {
    renderSidebar(UserRole.ADMINISTRADOR, '/suppliers');

    expect(await screen.findByRole('button', { name: /abastecimiento/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: /proveedores/i })).toHaveClass('bg-blue-600');
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

  it('renders the real pending price review count and hides zero', async () => {
    server.use(
      http.get('*/api/v1/price-reviews/pending-count', () => HttpResponse.json({ count: 4 })),
    );
    renderSidebar(UserRole.ADMINISTRADOR);
    expect(await screen.findByTestId('price-reviews-pending-badge')).toHaveTextContent('4');
    expect(screen.getByRole('button', { name: /productos y precios/i })).toContainElement(
      screen.getByTestId('price-reviews-pending-badge'),
    );
  });
});

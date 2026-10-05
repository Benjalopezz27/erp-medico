import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByRole('link', { name: /ventas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /configuración/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /compras/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reportes/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Abastecimiento')).not.toBeInTheDocument();
    expect(screen.queryByText('Finanzas')).not.toBeInTheDocument();
  });

  it('shows all 12 items to administrators without expanding anything', async () => {
    renderSidebar(UserRole.ADMINISTRADOR);

    await screen.findByRole('link', { name: /productos/i });
    const names = [
      'Inicio',
      'Ventas',
      'Productos',
      'Stock',
      'Clientes',
      'Compras',
      'Proveedores',
      'Tesorería',
      'Reportes',
      'Usuarios',
      'Alertas fiscales',
      'Configuración',
    ];
    for (const name of names) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: /importador|revisión|caja|cheques/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /abastecimiento/i })).toBeNull();
  });

  it('shows the brand, no version footer, and the user block with logout', async () => {
    renderSidebar(UserRole.ADMINISTRADOR);

    expect(await screen.findByText('Distribuidora Médica')).toBeInTheDocument();
    expect(screen.queryByText(/sprint 0/i)).not.toBeInTheDocument();
    expect(screen.getByText('Navigation User')).toBeInTheDocument();
    expect(screen.getByText('navigation@erp.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it.each([UserRole.VENDEDOR, UserRole.ADMINISTRADOR])(
    'links Ayuda and the user block to /help and /account for %s',
    async (role) => {
      renderSidebar(role);

      expect(await screen.findByRole('link', { name: 'Ayuda' })).toHaveAttribute('href', '/help');
      expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/account');
    },
  );

  it('highlights the parent item for unified child routes', async () => {
    renderSidebar(UserRole.ADMINISTRADOR, '/importer');

    expect(await screen.findByRole('link', { name: 'Proveedores' })).toHaveClass('bg-blue-600');
  });

  it('collapses to icons with accessible names and toggles via the button', async () => {
    const onToggle = vi.fn();
    useAuthStore.getState().setSession({
      accessToken: 'token',
      user: {
        id: 'u',
        name: 'Nav User',
        email: 'n@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });
    const router = createTestRouter(
      [
        {
          path: '/',
          component: () => (
            <Sidebar isOpen onClose={() => undefined} collapsed onToggleCollapsed={onToggle} />
          ),
        },
      ],
      '/',
    );
    const { user } = renderWithRouter({ router });

    const link = await screen.findByRole('link', { name: 'Ventas' });
    expect(link).toHaveAttribute('title', 'Ventas');
    await user.click(screen.getByRole('button', { name: /expandir menú lateral/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
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

  it('renders the fiscal alerts pending/rejected count for admins and hides zero', async () => {
    server.use(
      http.get('*/api/v1/sales/pending-fiscal/count', () =>
        HttpResponse.json({ pending: 2, rejected: 1, total: 3 }),
      ),
    );
    renderSidebar(UserRole.ADMINISTRADOR);
    expect(await screen.findByTestId('fiscal-alerts-badge')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: /alertas fiscales/i })).toContainElement(
      screen.getByTestId('fiscal-alerts-badge'),
    );
  });

  it('does not request the fiscal alerts count for a seller', async () => {
    renderSidebar(UserRole.VENDEDOR);
    expect(await screen.findByRole('link', { name: /productos/i })).toBeInTheDocument();
    expect(screen.queryByTestId('fiscal-alerts-badge')).not.toBeInTheDocument();
  });
});

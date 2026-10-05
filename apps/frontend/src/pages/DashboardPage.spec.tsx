import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DashboardPage } from './DashboardPage';

function renderAs(role: UserRole) {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useAuthStore.getState().setSession({
    accessToken: 't',
    user: { id: 'u', name: 'Ana', email: 'a@b.c', role, isActive: true },
  });
  const router = createTestRouter([{ path: '/', component: DashboardPage }] as never, '/');
  return renderWithRouter({ router });
}

describe('DashboardPage KPIs', () => {
  beforeEach(() => {
    server.use(
      http.get('*/api/v1/dashboard/kpis', () =>
        HttpResponse.json({
          salesToday: '450000.00',
          salesMonth: '8500000.00',
          lowStockProducts: 12,
          observedSupplierInvoices: 3,
          checksDueSoon: 5,
        }),
      ),
    );
  });

  it('shows the five KPIs to the admin, each with a link to its module', async () => {
    renderAs(UserRole.ADMINISTRADOR);
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/450\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/8\.500\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver stock' })).toHaveAttribute('href', '/stock');
    expect(screen.getByRole('link', { name: 'Ver facturas' })).toHaveAttribute(
      'href',
      expect.stringContaining('status=OBSERVADA'),
    );
    expect(screen.getByRole('link', { name: 'Ver cheques' })).toHaveAttribute(
      'href',
      '/treasury/checks',
    );
  });

  it('does not render KPI cards for a seller nor call the admin endpoint', async () => {
    let called = false;
    server.use(
      http.get('*/api/v1/dashboard/kpis', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    renderAs(UserRole.VENDEDOR);
    expect(await screen.findByText(/Bienvenido/)).toBeInTheDocument();
    expect(screen.queryByText('Bajo mínimo')).not.toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('shows the API error', async () => {
    server.use(
      http.get('*/api/v1/dashboard/kpis', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    renderAs(UserRole.ADMINISTRADOR);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

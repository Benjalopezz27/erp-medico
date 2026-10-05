import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { Topbar } from './Topbar';

describe('Topbar sales titles', () => {
  it('shows the POS title for the new-sale route', async () => {
    const router = createTestRouter(
      [{ path: '/sales/new', component: () => <Topbar onMenuToggle={() => undefined} /> }],
      '/sales/new',
    );
    renderWithRouter({ router });
    expect(await screen.findByText('Punto de Venta')).toBeInTheDocument();
  });

  it('shows the detail title for a sale id', async () => {
    const router = createTestRouter(
      [{ path: '/sales/$id', component: () => <Topbar onMenuToggle={() => undefined} /> }],
      '/sales/40000000-0000-4000-8000-000000000001',
    );
    renderWithRouter({ router });
    expect(await screen.findByText('Detalle de Venta')).toBeInTheDocument();
  });

  it('keeps breadcrumb and menu button but no user block or logout', async () => {
    const router = createTestRouter(
      [{ path: '/products', component: () => <Topbar onMenuToggle={() => undefined} /> }],
      '/products',
    );
    renderWithRouter({ router });
    expect(await screen.findByRole('button', { name: /abrir menú/i })).toBeInTheDocument();
    expect(screen.getByText('Productos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
  });
});

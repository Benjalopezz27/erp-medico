import { http, HttpResponse, type JsonBodyType } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { DashboardActivityType, type IDashboardActivityItem } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { ActivityFeed, formatRelativeTime } from './ActivityFeed';

const sale: IDashboardActivityItem = {
  id: 'SALE_CONFIRMED:s1',
  type: DashboardActivityType.SALE_CONFIRMED,
  title: 'Venta V-00000009',
  detail: 'Farmacia Smoke',
  amount: '16988.40',
  occurredAt: new Date().toISOString(),
  userName: 'Ana',
  link: { to: '/sales/$id', params: { id: 's1' } },
};

function renderFeed() {
  const router = createTestRouter(
    [
      { path: '/', component: ActivityFeed },
      { path: '/sales/$id', component: () => null },
    ] as never,
    '/',
  );
  return renderWithRouter({ router });
}

const respond = (body: JsonBodyType, status = 200) =>
  server.use(http.get('*/api/v1/dashboard/activity', () => HttpResponse.json(body, { status })));

describe('ActivityFeed', () => {
  it('shows a loading state before the response', async () => {
    server.use(http.get('*/api/v1/dashboard/activity', () => new Promise(() => {})));
    renderFeed();
    expect(await screen.findByRole('status', { name: /cargando actividad/i })).toBeInTheDocument();
    expect(screen.queryByText(/no hay actividad reciente/i)).not.toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    respond([]);
    renderFeed();
    expect(await screen.findByText('No hay actividad reciente')).toBeInTheDocument();
  });

  it('renders events with exact amount and links to the detail', async () => {
    respond([sale]);
    renderFeed();
    const link = await screen.findByRole('link', { name: /venta v-00000009/i });
    expect(link).toHaveAttribute('href', '/sales/s1');
    expect(link).toHaveTextContent(/16\.988,40/);
    expect(link).toHaveTextContent('Farmacia Smoke · Ana');
  });

  it('shows the error with a retry that recovers', async () => {
    respond({ message: 'boom' }, 500);
    const { user } = renderFeed();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    respond([sale]);
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByRole('link', { name: /venta v-00000009/i })).toBeInTheDocument();
  });
});

describe('ActivityFeed pagination', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    ...sale,
    id: `SALE_CONFIRMED:s${i + 1}`,
    title: `Venta V-${i + 1}`,
    link: { to: '/sales/$id', params: { id: `s${i + 1}` } },
  }));

  it('shows 5 events per page and pages through the rest', async () => {
    respond(many);
    const { user } = renderFeed();
    expect(await screen.findByRole('link', { name: /venta v-1\b/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getByRole('link', { name: /venta v-6\b/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
  });

  it('hides the pager when everything fits in one page', async () => {
    respond(many.slice(0, 5));
    renderFeed();
    await screen.findByRole('link', { name: /venta v-1\b/i });
    expect(screen.queryByRole('navigation', { name: /paginación/i })).not.toBeInTheDocument();
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-05T12:00:00Z').getTime();
  it('formats recent, minutes, hours and old dates', () => {
    expect(formatRelativeTime('2026-10-05T11:59:40Z', now)).toBe('hace un momento');
    expect(formatRelativeTime('2026-10-05T11:30:00Z', now)).toBe('hace 30 minutos');
    expect(formatRelativeTime('2026-10-05T09:00:00Z', now)).toBe('hace 3 horas');
    expect(formatRelativeTime('2026-09-01T12:00:00Z', now)).toBe('1/9/2026');
  });
});

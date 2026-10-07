import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IOnboardingStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { FirstStepsCard } from './FirstStepsCard';

const IDS = [
  'fiscal',
  'users',
  'catalog-base',
  'products',
  'parties',
  'treasury',
  'stock',
] as const;
const status = (done: string[], dismissed = false): IOnboardingStatus => ({
  steps: IDS.map((id) => ({ id, done: done.includes(id) })),
  dismissed,
  hintsDismissed: [],
});

function renderCard(s: IOnboardingStatus) {
  server.use(http.get('*/api/v1/config/onboarding-status', () => HttpResponse.json(s)));
  return renderWithRouter({
    router: createTestRouter([{ path: '/', component: FirstStepsCard }] as never, '/'),
  });
}

describe('FirstStepsCard', () => {
  it('marca los pasos hechos y enlaza los pendientes', async () => {
    renderCard(status(['fiscal', 'users']));
    expect(await screen.findByText('2 de 7 listos.', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Hecho')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Productos, precios y costos' })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('persiste el descarte y se oculta', async () => {
    let called = false;
    server.use(
      http.post('*/api/v1/config/onboarding/dismiss', () => {
        called = true;
        return HttpResponse.json(status([], true));
      }),
    );
    renderCard(status([]));
    await userEvent.click(await screen.findByLabelText('Descartar primeros pasos'));
    await screen.findByText('Primeros pasos', {}, { timeout: 100 }).catch(() => undefined);
    expect(called).toBe(true);
    expect(screen.queryByText('Primeros pasos')).toBeNull();
  });

  it.each([
    ['descartado', status([], true)],
    ['todo hecho', status([...IDS])],
  ])('no se muestra si está %s', async (_n, s) => {
    renderCard(s);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Primeros pasos')).toBeNull();
  });
});

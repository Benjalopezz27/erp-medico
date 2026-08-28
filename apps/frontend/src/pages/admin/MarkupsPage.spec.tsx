import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { MarkupLevel } from '@erp/shared-types';
import { getApiUrl } from '@/config/api.config';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { MarkupsPage } from './MarkupsPage';

const baseUrl = getApiUrl();
const globalRule = {
  id: '11111111-1111-4111-8111-111111111111',
  level: MarkupLevel.GLOBAL,
  percentage: '15.0000',
  categoryId: null,
  categoryName: null,
  productId: null,
  productCode: null,
  productName: null,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

function renderPage() {
  const router = createTestRouter(
    [
      { path: '/admin/markups', component: MarkupsPage },
      { path: '/settings', component: () => <div>Configuración</div> },
    ],
    '/admin/markups',
  );
  return renderWithRouter({ router });
}

describe('MarkupsPage', () => {
  beforeEach(() => {
    server.use(
      http.get(`${baseUrl}/prices/markups`, () => HttpResponse.json([globalRule])),
      http.get(`${baseUrl}/categories`, () =>
        HttpResponse.json([
          {
            id: 'category-1',
            name: 'Descartables',
            description: null,
            createdAt: '',
            updatedAt: '',
          },
        ]),
      ),
    );
  });

  it('loads all sections and permanently explains priority and active-price safety', async () => {
    server.use(
      http.get(`${baseUrl}/prices/markups`, async () => {
        await delay(200);
        return HttpResponse.json([globalRule]);
      }),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Configuración de markups' });
    expect(screen.getByLabelText('Cargando configuraciones de markup')).toBeInTheDocument();
    expect(await screen.findByText('15.0000%')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Excepciones por categoría' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Excepciones por producto' })).toBeInTheDocument();
    expect(screen.getByText(/Prioridad: Producto → Categoría → Global/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/nunca modifican automáticamente el precio activo/i).length,
    ).toBeGreaterThan(0);
  });

  it('edits global markup, sends a canonical string and shows success feedback', async () => {
    let payload: unknown;
    server.use(
      http.patch(`${baseUrl}/prices/markups/${globalRule.id}`, async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ ...globalRule, percentage: '20.2500' });
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: /Editar markup de Base/ }));
    const input = screen.getByLabelText('Porcentaje de markup');
    await user.clear(input);
    await user.type(input, '20.25');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(payload).toEqual({ percentage: '20.2500' }));
    expect(await screen.findByRole('status')).toHaveTextContent('actualizado correctamente');
  });

  it('offers retry after the initial list request fails', async () => {
    let attempts = 0;
    server.use(
      http.get(`${baseUrl}/prices/markups`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ message: 'Temporal' }, { status: 500 })
          : HttpResponse.json([globalRule]);
      }),
    );
    const { user } = renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporal');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('15.0000%')).toBeInTheDocument();
  });
});

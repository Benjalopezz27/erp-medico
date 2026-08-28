import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { PriceReviewStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { buildPriceReview } from '@/features/price-reviews/testing/price-review-fixtures';
import { PriceReviewsPage } from './PriceReviewsPage';

vi.mock('@/features/price-reviews/components/PriceReviewsFilters', () => ({
  PriceReviewsFilters: () => <div>Filtros de revisiones</div>,
}));

function renderPage() {
  const router = createTestRouter(
    [
      {
        path: '/prices/review',
        component: PriceReviewsPage,
        validateSearch: (search) => ({
          page: Number(search.page) || 1,
          limit: Number(search.limit) || 20,
          status: (search.status as PriceReviewStatus) || PriceReviewStatus.PENDIENTE,
        }),
      },
    ],
    '/prices/review?page=1&limit=20&status=PENDIENTE',
  );
  return renderWithRouter({ router });
}

describe('PriceReviewsPage', () => {
  it('renders the pending tray and authoritative backend rows', async () => {
    const review = buildPriceReview();
    server.use(
      http.get('*/api/v1/price-reviews/pending-count', () => HttpResponse.json({ count: 1 })),
      http.get('*/api/v1/price-reviews', () =>
        HttpResponse.json({
          data: [review],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Revisión de precios' })).toBeInTheDocument();
    expect(await screen.findAllByText('Jeringa 10 ml')).not.toHaveLength(0);
    expect(screen.getByText(/nunca cambia precios automáticamente/i)).toBeInTheDocument();
  });

  it('offers an actionable retry when the list fails', async () => {
    server.use(
      http.get('*/api/v1/price-reviews/pending-count', () => HttpResponse.json({ count: 0 })),
      http.get('*/api/v1/price-reviews', () => HttpResponse.json({}, { status: 500 })),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { PriceReviewStatus } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import { PriceReviewsFilters } from './PriceReviewsFilters';

vi.mock('@/features/categories/hooks/use-categories-query', () => ({
  useCategoriesQuery: () => ({ data: [] }),
}));
vi.mock('@/features/suppliers/hooks/use-suppliers-query', () => ({
  useSuppliersQuery: () => ({ data: { data: [] } }),
}));
vi.mock('@/features/products/components/ProductSearchInput', () => ({
  ProductSearchInput: () => <div>Buscador de producto</div>,
}));

describe('PriceReviewsFilters', () => {
  it('exposes accessible state tabs and reports URL-backed filter changes', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <PriceReviewsFilters
        filters={{ page: 1, limit: 20, status: PriceReviewStatus.PENDIENTE }}
        pendingCount={3}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByRole('tab', { name: /Pendientes 3/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('tab', { name: 'Aprobadas' }));
    expect(onChange).toHaveBeenCalledWith({ status: PriceReviewStatus.APROBADO });
    await user.type(screen.getByLabelText('Factura desde'), '2026-08-01');
    expect(onChange).toHaveBeenCalled();
  });
});

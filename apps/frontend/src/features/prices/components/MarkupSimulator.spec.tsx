import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkupLevel } from '@erp/shared-types';
import { renderWithProviders } from '@/test/test-utils';
import { MarkupSimulator } from './MarkupSimulator';

vi.mock('@/features/products/components/ProductSearchInput', () => ({
  ProductSearchInput: ({ onSelect }: { onSelect: (product: unknown) => void }) => (
    <button
      onClick={() => onSelect({ id: 'product-1', internalCode: 'P0001', name: 'Producto prueba' })}
    >
      Seleccionar producto
    </button>
  ),
}));
vi.mock('../hooks/use-markups-query', () => ({
  useMarkupSimulationQuery: (productId?: string) => ({
    data: productId
      ? {
          productId,
          productCode: 'P0001',
          productName: 'Producto prueba',
          costNet: '100.0000',
          suggestedPriceNet: '125.00',
          effectiveMarkup: {
            configurationId: 'markup-1',
            level: MarkupLevel.PRODUCT,
            percentage: '25.0000',
            targetId: productId,
            targetName: 'Producto prueba',
          },
        }
      : undefined,
    isFetching: false,
    isError: false,
  }),
}));

describe('MarkupSimulator', () => {
  it('renders the authoritative cost, level and suggestion without claiming an active-price change', async () => {
    const { user } = renderWithProviders(<MarkupSimulator />);
    await user.click(screen.getByRole('button', { name: 'Seleccionar producto' }));
    expect(screen.getByText('$ 100.0000')).toBeInTheDocument();
    expect(screen.getByText('Producto · Producto prueba')).toBeInTheDocument();
    expect(screen.getByText('$ 125.00')).toBeInTheDocument();
    expect(
      screen.getByText(/nunca edita ni aplica automáticamente el precio activo/i),
    ).toBeInTheDocument();
  });
});

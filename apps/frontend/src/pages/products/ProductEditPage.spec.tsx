import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductStatus } from '@erp/shared-types';
import { ProductEditPage } from './ProductEditPage';
import * as categoriesApi from '@/features/categories/api/categories.api';
import * as unitsApi from '@/features/units/api/units.api';
import * as productsApi from '@/features/products/api/products.api';

const validCategoryId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validBaseUnitId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const validBoxUnitId = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const validProductId = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
const validConvId = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: validProductId }),
}));

vi.mock('@/features/categories/api/categories.api');
vi.mock('@/features/units/api/units.api');
vi.mock('@/features/products/api/products.api');

describe('ProductEditPage', () => {
  let queryClient: QueryClient;

  const mockProduct = {
    id: validProductId,
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    description: 'Analgésico',
    categoryId: validCategoryId,
    baseUnitId: validBaseUnitId,
    minStock: 50,
    costNet: 1000,
    markupPercentage: 35,
    suggestedPriceNet: 1350,
    activePriceNet: 1350,
    status: ProductStatus.ACTIVE,
    conversions: [
      {
        id: validConvId,
        productId: validProductId,
        presentationUnitId: validBoxUnitId,
        conversionFactor: 100,
        createdAt: '',
        updatedAt: '',
      },
    ],
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(productsApi.getProductByIdApi).mockResolvedValue(mockProduct as any);
    vi.mocked(categoriesApi.getCategoriesApi).mockResolvedValue([
      { id: validCategoryId, name: 'Medicamentos', createdAt: '', updatedAt: '' },
    ]);
    vi.mocked(unitsApi.getUnitsApi).mockResolvedValue([
      { id: validBaseUnitId, name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
      { id: validBoxUnitId, name: 'Caja', symbol: 'cj', createdAt: '', updatedAt: '' },
    ]);
  });

  it('renders prefilled edit form with locked internalCode', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Editar Producto/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('MED-001')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('MED-001')).toBeDisabled();
    expect(screen.getByDisplayValue('Ibuprofeno 400mg')).toBeInTheDocument();
  });

  it('shows no-op message if submit is clicked without changes', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/No se detectaron modificaciones/i)).toBeInTheDocument();
    });

    expect(productsApi.updateProductApi).not.toHaveBeenCalled();
  });

  it('submits delta and reconciles changes when name is updated', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.updateProductApi).mockResolvedValue({} as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ProductEditPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ibuprofeno 400mg')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Ibuprofeno 400mg');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ibuprofeno 600mg');

    const submitBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(productsApi.updateProductApi).toHaveBeenCalledWith(validProductId, {
        name: 'Ibuprofeno 600mg',
      });
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/products' }));
    });
  });
});

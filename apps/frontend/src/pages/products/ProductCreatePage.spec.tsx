import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductCreatePage } from './ProductCreatePage';
import * as categoriesApi from '@/features/categories/api/categories.api';
import * as unitsApi from '@/features/units/api/units.api';
import * as productsApi from '@/features/products/api/products.api';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/categories/api/categories.api');
vi.mock('@/features/units/api/units.api');
vi.mock('@/features/products/api/products.api');

describe('ProductCreatePage', () => {
  let queryClient: QueryClient;

  const validCategoryId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const validBaseUnitId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.mocked(categoriesApi.getCategoriesApi).mockResolvedValue([
      { id: validCategoryId, name: 'Medicamentos', createdAt: '', updatedAt: '' },
    ]);

    vi.mocked(unitsApi.getUnitsApi).mockResolvedValue([
      { id: validBaseUnitId, name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    ]);
  });

  it('renders creation form and allows back navigation', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductCreatePage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nuevo Producto')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /Volver al Catálogo/i });
    await user.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/products',
      search: { page: 1, limit: 10 },
    });
  });

  it('submits valid product and navigates with notice=created', async () => {
    const user = userEvent.setup();
    vi.mocked(productsApi.createProductApi).mockResolvedValue({ id: 'new-p' } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ProductCreatePage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Se asignará automáticamente al guardar/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Amoxicilina 500mg');
    await user.selectOptions(screen.getByLabelText(/Categoría/i), validCategoryId);
    await user.selectOptions(screen.getByLabelText(/^Unidad Base \*$/i), validBaseUnitId);
    await user.clear(screen.getByLabelText(/Stock Inicial/i));
    await user.type(screen.getByLabelText(/Stock Inicial/i), '25');
    await user.type(screen.getByLabelText(/Costo Neto/i), '1500');
    await user.type(screen.getByLabelText(/Precio Activo/i), '2000');

    const submitBtn = screen.getByRole('button', { name: /Guardar Producto/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(productsApi.createProductApi).toHaveBeenCalled();
      expect(productsApi.createProductApi).toHaveBeenCalledWith(
        expect.objectContaining({ initialStock: 25 }),
      );
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/products' }));
    });
  });
});

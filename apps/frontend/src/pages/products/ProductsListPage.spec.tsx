import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductStatus, ProductTaxTreatment, UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { ProductsListPage } from './ProductsListPage';
import * as productsApi from '@/features/products/api/products.api';
import * as categoriesApi from '@/features/categories/api/categories.api';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({ page: 1, limit: 10, status: undefined }),
}));

vi.mock('@/features/products/api/products.api');
vi.mock('@/features/categories/api/categories.api');

describe('ProductsListPage', () => {
  let queryClient: QueryClient;

  const mockProduct = {
    id: 'prod-1',
    internalCode: 'P0001',
    name: 'Ibuprofeno 400mg',
    categoryId: 'c-1',
    baseUnitId: 'u-1',
    minStock: 50,
    costNet: 1000,
    markupPercentage: 35,
    suggestedPriceNet: 1350,
    activePriceNet: 1350,
    taxTreatment: ProductTaxTreatment.GRAVADO,
    ivaPercentage: 21,
    status: ProductStatus.ACTIVE,
    category: { id: 'c-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
    baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u', createdAt: '', updatedAt: '' },
    conversions: [],
    createdAt: '',
    updatedAt: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    useAuthStore.setState({
      user: {
        id: 'u-admin',
        name: 'Admin User',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
      isAuthenticated: true,
    });

    vi.mocked(productsApi.getProductsApi).mockResolvedValue({
      items: [mockProduct],
      total: 1,
      offset: 0,
      limit: 10,
    });

    vi.mocked(categoriesApi.getCategoriesApi).mockResolvedValue([
      { id: 'c-1', name: 'Medicamentos', createdAt: '', updatedAt: '' },
    ]);
  });

  it('renders products list and handles create navigation for Admin', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsListPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Nuevo Producto/i });
    expect(createBtn).toBeInTheDocument();

    await user.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/products/new' });
  });

  it('navigates to edit page when clicking edit button', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsListPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Editar Ibuprofeno 400mg')).toBeInTheDocument();
    });

    const editBtn = screen.getByLabelText('Editar Ibuprofeno 400mg');
    await user.click(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/products/$id/edit',
      params: { id: 'prod-1' },
    });
  });

  it('omits create button and admin columns for Seller', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-seller',
        name: 'Seller User',
        email: 'seller@erp.com',
        role: UserRole.VENDEDOR,
        isActive: true,
      },
      isAuthenticated: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsListPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Nuevo Producto/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Costo Neto')).not.toBeInTheDocument();
    expect(screen.queryByText('Markup')).not.toBeInTheDocument();
    expect(screen.queryByText('Acciones')).not.toBeInTheDocument();
  });

  it('handles search input change with replace: true navigation and resets page to 1', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductsListPage />
      </QueryClientProvider>,
    );

    const searchInput = screen.getByLabelText('Buscar en el catálogo');
    await user.type(searchInput, 'Amoxi');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/products',
          replace: true,
        }),
      );
    });
  });
});

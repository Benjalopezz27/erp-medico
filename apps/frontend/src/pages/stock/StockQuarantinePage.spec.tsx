import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockQuarantinePage } from './StockQuarantinePage';
import * as quarantineHooks from '@/features/stock/hooks/use-quarantine';
import * as productHooks from '@/features/products/hooks/use-product-search-query';
import { QuarantineStatus } from '@/features/stock/types/quarantine.types';

const mockNavigate = vi.fn();
const mockSearch: Record<string, unknown> = { page: 1, limit: 10 };

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

vi.mock('@/features/stock/hooks/use-quarantine', () => ({
  useQuarantineListQuery: vi.fn(),
  useCreateQuarantineMutation: vi.fn(),
  useResolveQuarantineMutation: vi.fn(),
}));

vi.mock('@/features/products/hooks/use-product-search-query', () => ({
  useProductSearchQuery: vi.fn(),
}));

describe('StockQuarantinePage Integration', () => {
  const mockItem = {
    id: 'q-1',
    productId: 'p-1',
    product: {
      id: 'p-1',
      internalCode: 'P-001',
      name: 'Amoxicilina 500mg',
      baseUnit: { id: 'u-1', name: 'Comprimido', symbol: 'cmp' },
    },
    quantityBase: 50,
    reason: 'Humedad en depósito',
    status: QuarantineStatus.EN_CUARENTENA,
    entryActorId: 'u-1',
    entryActor: { id: 'u-1', name: 'Admin', email: 'admin@erp.com' },
    entryMovementId: 'm-1',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(quarantineHooks.useQuarantineListQuery).mockReturnValue({
      data: {
        items: [mockItem],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(quarantineHooks.useCreateQuarantineMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(quarantineHooks.useResolveQuarantineMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(productHooks.useProductSearchQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('renders page header and quarantine table with items', () => {
    render(<StockQuarantinePage />);

    expect(screen.getByTestId('stock-quarantine-page')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Stock en Cuarentena')).toBeInTheDocument();
    expect(screen.getByText('Amoxicilina 500mg')).toBeInTheDocument();
    expect(screen.getByText('50,00')).toBeInTheDocument();
  });

  it('opens create modal when clicking Ingresar a Cuarentena button', () => {
    render(<StockQuarantinePage />);

    const openBtn = screen.getByTestId('open-quarantine-create-modal-btn');
    fireEvent.click(openBtn);

    expect(screen.getByTestId('quarantine-create-form')).toBeInTheDocument();
  });

  it('opens resolve modal when clicking Resolver button in table row', () => {
    render(<StockQuarantinePage />);

    const resolveBtn = screen.getByTestId('quarantine-resolve-btn-q-1');
    fireEvent.click(resolveBtn);

    expect(screen.getByTestId('quarantine-resolve-form')).toBeInTheDocument();
  });
});

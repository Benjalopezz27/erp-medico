import { fireEvent, render, screen } from '@testing-library/react';
import { PurchaseBackordersPage } from './PurchaseBackordersPage';
import * as backordersHook from '@/features/purchase-orders/hooks/use-backorders-query';
import * as suppliersHook from '@/features/suppliers/hooks/use-suppliers-query';
import { backordersFixture } from '@/features/purchase-orders/testing/backorder-fixtures';

const mockNavigate = vi.fn();
let mockSearch: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    const href = params?.id ? String(to).replace('$id', params.id) : to;
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));
vi.mock('@/features/purchase-orders/hooks/use-backorders-query');
vi.mock('@/features/suppliers/hooks/use-suppliers-query');

describe('PurchaseBackordersPage', () => {
  beforeEach(() => {
    mockSearch = {};
    vi.spyOn(suppliersHook, 'useSuppliersQuery').mockReturnValue({ data: { data: [] } } as any);
    vi.spyOn(backordersHook, 'useBackordersQuery').mockReturnValue({
      data: backordersFixture,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders summary, urgent order, pending quantity and receipt navigation', () => {
    render(<PurchaseBackordersPage />);

    expect(
      screen.getByRole('heading', { name: 'Mercadería pendiente', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Droguería Central')).toBeInTheDocument();
    expect(screen.getByText('OC-000123')).toBeInTheDocument();
    expect(screen.getByText('17 días desde emisión')).toBeInTheDocument();
    expect(screen.getByText('6 cja')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Registrar recepción/ })).toHaveAttribute(
      'href',
      '/purchases/orders/22222222-2222-4222-8222-222222222222/receive',
    );
  });

  it('collapses a supplier group accessibly', () => {
    render(<PurchaseBackordersPage />);
    const toggle = screen.getByRole('button', { name: /Droguería Central/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Gasa estéril')).not.toBeInTheDocument();
  });

  it('distinguishes an empty backlog from an empty filtered result', () => {
    vi.spyOn(backordersHook, 'useBackordersQuery').mockReturnValue({
      data: {
        ...backordersFixture,
        groups: [],
        summary: { ...backordersFixture.summary, orderCount: 0 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
    const { rerender } = render(<PurchaseBackordersPage />);
    expect(screen.getByText('No hay mercadería pendiente')).toBeInTheDocument();

    mockSearch = { urgentOnly: true };
    rerender(<PurchaseBackordersPage />);
    expect(screen.getByText('No hay coincidencias')).toBeInTheDocument();
  });

  it('renders an actionable error state', () => {
    vi.spyOn(backordersHook, 'useBackordersQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: { response: { status: 500 } },
      refetch: vi.fn(),
    } as any);

    render(<PurchaseBackordersPage />);
    expect(screen.getByText('Error al cargar la mercadería pendiente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

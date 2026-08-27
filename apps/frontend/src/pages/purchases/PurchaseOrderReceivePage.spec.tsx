import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PurchaseOrderReceivePage } from './PurchaseOrderReceivePage';
import { usePurchaseOrderDetailQuery } from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import { PurchaseOrderStatus } from '@/features/purchase-orders/types/purchase-orders.types';
import {
  goodsReceiptSuccessFixture,
  purchaseOrderReceiptFixture,
} from '@/features/purchase-orders/testing/goods-receipt-fixtures';

let routeId = purchaseOrderReceiptFixture.id;
const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useParams: () => ({ id: routeId }),
  useNavigate: () => navigate,
}));
vi.mock('@/features/purchase-orders/hooks/use-purchase-orders-query');
vi.mock('@/features/purchase-orders/components/goods-receipts/GoodsReceiptForm', () => ({
  GoodsReceiptForm: ({
    onSuccess,
  }: {
    onSuccess: (response: typeof goodsReceiptSuccessFixture) => void;
  }) => (
    <button type="button" onClick={() => onSuccess(goodsReceiptSuccessFixture)}>
      Mock receipt form
    </button>
  ),
}));
vi.mock('@/features/purchase-orders/components/goods-receipts/GoodsReceiptSuccessSummary', () => ({
  GoodsReceiptSuccessSummary: () => <div>Mock success summary</div>,
}));

describe('PurchaseOrderReceivePage', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    routeId = purchaseOrderReceiptFixture.id;
    vi.mocked(usePurchaseOrderDetailQuery).mockReturnValue({
      data: purchaseOrderReceiptFixture,
      isLoading: false,
      isError: false,
      refetch,
    } as any);
  });

  it('renders the receipt flow for a partial order and transitions to success', () => {
    render(<PurchaseOrderReceivePage />);
    expect(screen.getByRole('heading', { name: 'Registrar recepción' })).toBeInTheDocument();
    expect(screen.getByText('Distribuidora Médica')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mock receipt form' }));
    expect(screen.getByText('Mock success summary')).toBeInTheDocument();
  });

  it('does not load the API for an invalid UUID', () => {
    routeId = 'invalid-id';
    render(<PurchaseOrderReceivePage />);
    expect(usePurchaseOrderDetailQuery).toHaveBeenCalledWith('');
    expect(screen.getByText('Identificador de orden inválido')).toBeInTheDocument();
  });

  it('blocks a completed order from receiving more stock', () => {
    vi.mocked(usePurchaseOrderDetailQuery).mockReturnValue({
      data: { ...purchaseOrderReceiptFixture, status: PurchaseOrderStatus.COMPLETADA },
      isLoading: false,
      isError: false,
      refetch,
    } as any);
    render(<PurchaseOrderReceivePage />);
    expect(screen.getByText('La orden no admite recepciones')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mock receipt form' })).not.toBeInTheDocument();
  });
});

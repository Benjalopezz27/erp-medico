import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoodsReceiptsHistory } from './GoodsReceiptsHistory';
import { useGoodsReceiptsQuery } from '../../hooks/use-goods-receipts-query';
import { goodsReceiptFixture } from '../../testing/goods-receipt-fixtures';

vi.mock('../../hooks/use-goods-receipts-query');

describe('GoodsReceiptsHistory', () => {
  beforeEach(() => {
    vi.mocked(useGoodsReceiptsQuery).mockReturnValue({
      data: {
        data: [goodsReceiptFixture],
        meta: {
          total: 11,
          page: 1,
          limit: 10,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as any);
  });

  it('renders receipt metadata, expandable lines and pagination', () => {
    render(<GoodsReceiptsHistory purchaseOrderId="po-1" />);

    expect(screen.getByText('REC-000001')).toBeInTheDocument();
    expect(screen.getByText(/0001-00001234/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('REC-000001'));
    expect(screen.getByText('Curitas x 20')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(useGoodsReceiptsQuery).toHaveBeenLastCalledWith(
      'po-1',
      { page: 2, limit: 10 },
      { enabled: true },
    );
  });

  it('does not query the backend for a draft order', () => {
    render(<GoodsReceiptsHistory purchaseOrderId="po-1" enabled={false} />);
    expect(screen.getByText(/borrador todavía no tienen recepciones/i)).toBeInTheDocument();
    expect(useGoodsReceiptsQuery).toHaveBeenCalledWith(
      'po-1',
      { page: 1, limit: 10 },
      { enabled: false },
    );
  });
});

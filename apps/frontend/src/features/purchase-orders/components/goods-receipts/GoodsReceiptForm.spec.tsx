import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoodsReceiptErrorCode } from '../../types/purchase-orders.types';
import {
  goodsReceiptSuccessFixture,
  purchaseOrderReceiptFixture,
} from '../../testing/goods-receipt-fixtures';
import { GoodsReceiptForm } from './GoodsReceiptForm';
import { useCreateGoodsReceiptMutation } from '../../hooks/use-goods-receipt-mutation';

vi.mock('../../hooks/use-goods-receipt-mutation');

describe('GoodsReceiptForm', () => {
  const mutateAsync = vi.fn();
  const onSuccess = vi.fn();
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.mocked(useCreateGoodsReceiptMutation).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as any);
  });

  function renderForm() {
    return render(
      <GoodsReceiptForm
        order={purchaseOrderReceiptFixture}
        onSuccess={onSuccess}
        onConcurrencyRefresh={onRefresh}
        onCancel={vi.fn()}
      />,
    );
  }

  async function prepareValidReceipt() {
    fireEvent.change(screen.getByLabelText(/Número de remito/i), {
      target: { value: '0001-00001234' },
    });
    fireEvent.change(screen.getByLabelText(/Cantidad a recibir de Curitas/i), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Revisar recepción/i }));
    await screen.findByRole('dialog');
  }

  it('renders only pending lines, calculates base quantity and submits after confirmation', async () => {
    mutateAsync.mockResolvedValueOnce(goodsReceiptSuccessFixture);
    renderForm();

    expect(screen.getByText('Curitas x 20')).toBeInTheDocument();
    expect(screen.queryByText('Gasas x 10')).not.toBeInTheDocument();
    await prepareValidReceipt();
    expect(screen.getByText('20')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Confirmar recepción$/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(goodsReceiptSuccessFixture));
    expect(mutateAsync).toHaveBeenCalledWith({
      deliveryNoteNumber: '0001-00001234',
      items: [
        {
          purchaseOrderItemId: purchaseOrderReceiptFixture.items[0].id,
          receivedQtyPurchaseUnit: 2,
          provisionalCostUnitNet: 100,
        },
      ],
    });
  });

  it('keeps line values and focuses the remito after a duplicate error', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE },
      },
    });
    renderForm();
    await prepareValidReceipt();
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar recepción$/i }));

    expect(await screen.findByText(/ya fue registrado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cantidad a recibir de Curitas/i)).toHaveValue('2');
    expect(screen.getByLabelText(/Número de remito/i)).toHaveFocus();
  });

  it('refreshes and rebuilds line values after a concurrency conflict', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { code: GoodsReceiptErrorCode.GOODS_RECEIPT_CONCURRENCY_CONFLICT },
      },
    });
    const refreshedOrder = {
      ...purchaseOrderReceiptFixture,
      items: purchaseOrderReceiptFixture.items.map((item, index) =>
        index === 0
          ? {
              ...item,
              receivedQty: '5.0000',
              pendingQty: '5.0000',
              expectedCostUnitNet: '120.0000',
            }
          : item,
      ),
    };
    onRefresh.mockResolvedValueOnce(refreshedOrder);
    renderForm();
    await prepareValidReceipt();
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar recepción$/i }));

    expect(await screen.findByText(/saldos fueron actualizados/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cantidad a recibir de Curitas/i)).toHaveValue('');
    expect(screen.getByLabelText(/Costo provisional de Curitas/i)).toHaveValue('120.0000');
    expect(screen.getByLabelText(/Número de remito/i)).toHaveValue('0001-00001234');
  });
});

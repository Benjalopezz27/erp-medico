import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { buildStockAdjustmentResponse } from '../testing/stock-fixtures';
import { StockMovementType } from '@erp/shared-types';

describe('StockAdjustmentModal', () => {
  const mockProduct = {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    internalCode: 'P0001',
    productName: 'Ibuprofeno 400mg',
    baseUnit: {
      id: 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
      name: 'Caja',
      symbol: 'cj',
    },
    currentBaseStock: 100,
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    product: mockProduct,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product details and form inputs when open', () => {
    renderWithProviders(<StockAdjustmentModal {...defaultProps} />);

    expect(screen.getByText('Registrar Ajuste Manual de Stock')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();
    expect(screen.getByText(/100,00 cj/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de movimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cantidad a ajustar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/motivo del ajuste/i)).toBeInTheDocument();
  });

  it('shows calculation helper text when a quantity is entered', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StockAdjustmentModal {...defaultProps} />);

    const qtyInput = screen.getByLabelText(/cantidad a ajustar/i);
    await user.type(qtyInput, '15');

    const helper = screen.getByTestId('stock-adjustment-calc-helper');
    expect(helper).toBeInTheDocument();
    expect(helper).toHaveTextContent(
      /se sumarán.*15,00 cj.*al stock actual.*nuevo saldo proyectado:.*115,00 cj/i,
    );
  });

  it('prevents double submission using deferred response and disables confirm button', async () => {
    const user = userEvent.setup();
    let resolveRequest: (val: any) => void;
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    let postCallCount = 0;

    server.use(
      http.post('*/api/v1/stock/adjustments', async () => {
        postCallCount++;
        await requestPromise;
        return HttpResponse.json(buildStockAdjustmentResponse());
      }),
    );

    renderWithProviders(<StockAdjustmentModal {...defaultProps} />);

    await user.type(screen.getByLabelText(/cantidad a ajustar/i), '10');
    await user.type(screen.getByLabelText(/motivo del ajuste/i), 'Conteo físico');

    const submitBtn = screen.getByRole('button', { name: /confirmar ajuste/i });
    await user.click(submitBtn);

    // Button is disabled and in submitting state
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText('Registrando...')).toBeInTheDocument();

    // Second click should be ignored
    await user.click(submitBtn);

    // Resolve deferred promise
    resolveRequest!(true);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    expect(postCallCount).toBe(1);
  });

  it('displays structured 422 error banner on insufficient stock', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('*/api/v1/stock/adjustments', () => {
        return HttpResponse.json(
          {
            statusCode: 422,
            code: 'INSUFFICIENT_STOCK',
            message: 'Stock insuficiente para completar la operación.',
            details: {
              productId: mockProduct.productId,
              available: 5,
              requested: 10,
            },
          },
          { status: 422 },
        );
      }),
    );

    renderWithProviders(<StockAdjustmentModal {...defaultProps} />);

    await user.selectOptions(
      screen.getByLabelText(/tipo de movimiento/i),
      StockMovementType.AJUSTE_SALIDA,
    );
    await user.type(screen.getByLabelText(/cantidad a ajustar/i), '10');
    await user.type(screen.getByLabelText(/motivo del ajuste/i), 'Ajuste salida excesivo');

    await user.click(screen.getByRole('button', { name: /confirmar ajuste/i }));

    const errorBanner = await screen.findByTestId('stock-adjustment-error-banner');
    expect(errorBanner).toBeInTheDocument();
    expect(errorBanner).toHaveTextContent(
      /stock insuficiente para realizar el ajuste.*stock disponible: 5,00 u.*cantidad solicitada: 10,00 u/i,
    );
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});

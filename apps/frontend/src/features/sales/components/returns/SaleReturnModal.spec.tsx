import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CustomerPricingRuleApplied,
  PaymentMethod,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  SaleStatus,
  type ISale,
} from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { SaleReturnModal } from './SaleReturnModal';

const mockSale: ISale = {
  id: '40000000-0000-4000-8000-000000000001',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: '50000000-0000-4000-8000-000000000001', name: 'Vendedor' },
  status: SaleStatus.CONFIRMADA,
  isCreditSale: false,
  requiresFiscalInvoice: true,
  paymentMethod: PaymentMethod.EFECTIVO,
  totalNet: '100.00',
  taxableNet: '100.00',
  exemptAmount: '0.00',
  nonTaxedAmount: '0.00',
  ivaTotal: '21.00',
  totalGross: '121.00',
  userId: '50000000-0000-4000-8000-000000000001',
  fiscalDocument: null,
  accountReceivable: null,
  createdAt: '2026-08-31T12:00:00Z',
  updatedAt: '2026-08-31T12:00:00Z',
  items: [
    {
      id: '60000000-0000-4000-8000-000000000001',
      saleId: '40000000-0000-4000-8000-000000000001',
      productId: '30000000-0000-4000-8000-000000000001',
      itemIndex: 0,
      quantityBase: 5,
      catalogPriceNet: '10.00',
      pricingRuleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      pricingRuleId: null,
      discountPercentage: null,
      discountAmountNet: '0.00',
      unitPriceNet: '10.00',
      subtotalNet: '50.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      ivaAmount: '10.50',
      subtotalGross: '60.50',
      product: {
        id: '30000000-0000-4000-8000-000000000001',
        internalCode: 'P001',
        name: 'Ibuprofeno 400mg',
      },
    },
  ],
};

describe('SaleReturnModal', () => {
  it('renders modal and submits return payload upon confirmation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    let submittedPayload: any = null;
    server.use(
      http.post('*/api/v1/sales/*/returns', async ({ request }) => {
        submittedPayload = await request.json();
        return HttpResponse.json({ id: 'ret-1', saleId: 'sale-1' }, { status: 201 });
      }),
    );

    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnModal isOpen={true} onClose={onClose} sale={mockSale} returns={[]} />
        ),
      },
    ]);
    renderWithRouter({ router });

    expect(await screen.findByText(/Registrar devolución de venta/i)).toBeInTheDocument();
    expect(screen.getByText('Ibuprofeno 400mg')).toBeInTheDocument();

    // Select the item
    const checkbox = screen.getByRole('checkbox', { name: /Seleccionar Ibuprofeno 400mg/i });
    await user.click(checkbox);

    // Enter reason
    const reasonInput = screen.getByLabelText(/Motivo general/i);
    await user.type(reasonInput, 'Devolución por fecha de vencimiento');

    // Confirm summary text
    expect(screen.getByText(/unidades ingresan a/i)).toBeInTheDocument();

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Confirmar devolución/i });
    await user.click(submitBtn);

    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload.reason).toBe('Devolución por fecha de vencimiento');
    expect(submittedPayload.items[0].quantityBase).toBe(5);
    expect(submittedPayload.items[0].quality).toBe(SaleReturnItemQuality.APTO);
    expect(onClose).toHaveBeenCalled();
  });

  it('displays conflict message when 409 is returned from backend', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onRefetch = vi.fn().mockResolvedValue(undefined);

    server.use(
      http.post('*/api/v1/sales/*/returns', () => {
        return HttpResponse.json(
          {
            code: 'SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY',
            message: 'La cantidad a devolver excede el saldo restante disponible.',
          },
          { status: 409 },
        );
      }),
    );

    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnModal
            isOpen={true}
            onClose={onClose}
            sale={mockSale}
            returns={[]}
            onRefetchSaleAndReturns={onRefetch}
          />
        ),
      },
    ]);
    renderWithRouter({ router });

    expect(await screen.findByText(/Registrar devolución de venta/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Seleccionar Ibuprofeno 400mg/i }));
    await user.type(screen.getByLabelText(/Motivo general/i), 'Devolución concurrente');
    await user.click(screen.getByRole('button', { name: /Confirmar devolución/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/excede el saldo restante/i);
    expect(onRefetch).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

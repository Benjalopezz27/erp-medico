import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceErrorCode,
  SupplierInvoiceObservationReason,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
} from '@/features/supplier-invoices/types/supplier-invoices.types';
import { SupplierInvoiceDetailPage } from './SupplierInvoiceDetailPage';

const authorize = vi.fn();
const reject = vi.fn();
const confirm = vi.fn();
const refetch = vi.fn();
let invoice: any;

vi.mock('@/features/supplier-invoices/hooks/use-supplier-invoices', () => ({
  useSupplierInvoiceQuery: () => ({
    data: invoice,
    isLoading: false,
    isError: false,
    refetch,
  }),
  useAuthorizeSupplierInvoiceMutation: () => ({ mutateAsync: authorize, isPending: false }),
  useRejectSupplierInvoiceMutation: () => ({ mutateAsync: reject, isPending: false }),
  useConfirmSupplierInvoiceMutation: () => ({ mutateAsync: confirm, isPending: false }),
}));

const id = '11111111-1111-4111-a111-111111111111';

function fixture(status = SupplierInvoiceStatus.OBSERVADA) {
  return {
    id,
    invoiceNumber: 'A-0001',
    status,
    supplier: { id: 'supplier', businessName: 'Proveedor', cuit: '30123456789' },
    goodsReceipt: {
      id: 'receipt',
      receiptNumber: 'REC-1',
      deliveryNoteNumber: 'REM-1',
      createdAt: '2026-08-27T10:00:00.000Z',
    },
    purchaseOrder: { id, orderNumber: 'OC-1' },
    invoiceDate: '2026-08-27',
    netTotal: '1060.0000',
    taxTotal: '222.6000',
    taxMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
    taxPercentage: '21.0000',
    totalAmount: '1282.6000',
    costTolerancePercentageSnapshot: '5.0000',
    itemCount: 1,
    observedLineCount: status === SupplierInvoiceStatus.OBSERVADA ? 1 : 0,
    user: { id: 'admin', name: 'Admin', email: 'admin@erp.com' },
    createdAt: '2026-08-27T10:00:00.000Z',
    updatedAt: '2026-08-27T10:00:00.000Z',
    decision: null,
    confirmation: null,
    items: [
      {
        id: 'item',
        itemIndex: 1,
        goodsReceiptItemId: 'receipt-item',
        purchaseOrderItemId: 'po-item',
        productId: 'product',
        productCode: '001',
        productName: 'Producto médico',
        purchaseUnitId: 'unit',
        purchaseUnitName: 'Caja',
        purchaseUnitSymbol: 'CJA',
        conversionFactor: '10.0000',
        receivedQtyPurchaseUnit: '5.0000',
        previouslyAllocatedQtyPurchaseUnit: '0.0000',
        availableQtyBefore: '5.0000',
        invoicedQtyPurchaseUnit: '6.0000',
        allocatedReceivedQtyPurchaseUnit: '5.0000',
        allocatedReceivedQtyBase: '50.00',
        pendingQtyAfter: '0.0000',
        quantityExcess: '1.0000',
        quantityStatus: SupplierInvoiceQuantityStatus.EXCEDIDA,
        provisionalCostUnitNet: '100.0000',
        unitPriceNet: '106.0000',
        discountNet: '0.0000',
        bonusNet: '0.0000',
        surchargeNet: '0.0000',
        realCostUnitNet: '106.0000',
        lineNetTotal: '1060.0000',
        discountMode: SupplierInvoiceAdjustmentMode.AMOUNT,
        discountPercentage: null,
        bonusMode: SupplierInvoiceAdjustmentMode.AMOUNT,
        bonusPercentage: null,
        surchargeMode: SupplierInvoiceAdjustmentMode.AMOUNT,
        surchargePercentage: null,
        costDifferenceUnitNet: '6.0000',
        costVariationPercentage: '6.0000',
        costStatus: SupplierInvoiceCostStatus.EXCEEDS_TOLERANCE,
        observationReasons: [
          SupplierInvoiceObservationReason.QUANTITY_EXCESS,
          SupplierInvoiceObservationReason.COST_VARIATION,
        ],
      },
    ],
  };
}

function renderPage() {
  const router = createTestRouter(
    [{ path: '/purchases/supplier-invoices/$id', component: SupplierInvoiceDetailPage }],
    `/purchases/supplier-invoices/${id}`,
  );
  return renderWithRouter({ router });
}

describe('SupplierInvoiceDetailPage observed workflow', () => {
  beforeEach(() => {
    invoice = fixture();
    authorize.mockReset();
    reject.mockReset();
    confirm.mockReset();
    refetch.mockReset();
  });

  it('shows tolerance and every observation reason', async () => {
    renderPage();
    expect(await screen.findByText(/Factura observada: requiere una decisión/)).toBeInTheDocument();
    expect(screen.getAllByText(/Exceso de cantidad/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Variación de costo/).length).toBeGreaterThan(0);
    expect(screen.getByText('+$ 6,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Autorizar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('requires and submits a rejection reason', async () => {
    reject.mockResolvedValue({ ...invoice, status: SupplierInvoiceStatus.RECHAZADA });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Motivo del rechazo'), 'Costo no acordado');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar rechazo' }));
    expect(reject).toHaveBeenCalledWith({
      id,
      payload: { reason: 'Costo no acordado' },
    });
    expect(await screen.findByRole('status')).toHaveTextContent('saldo facturable');
  });

  it('offers confirmation but not review decisions for an automatically authorized invoice', async () => {
    invoice = fixture(SupplierInvoiceStatus.AUTORIZADA);
    renderPage();
    expect(await screen.findByText('Autorización automática')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Autorizar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar factura' })).toBeInTheDocument();
  });

  it('shows the irreversible impact summary and confirms once', async () => {
    invoice = fixture(SupplierInvoiceStatus.AUTORIZADA);
    confirm.mockResolvedValue({
      ...invoice,
      status: SupplierInvoiceStatus.CONFIRMADA,
      confirmation: { adjustments: [], priceReviews: [] },
    });
    const { user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Confirmar factura' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Esta operación es irreversible.')).toBeInTheDocument();
    expect(within(dialog).getByText(/no cambia el precio activo/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/50,00 u\. base/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar y aplicar ajustes' }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(id);
    expect(await screen.findByRole('status')).toHaveTextContent('ajustes de costos');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    SupplierInvoiceStatus.BORRADOR,
    SupplierInvoiceStatus.VALIDANDO,
    SupplierInvoiceStatus.OBSERVADA,
    SupplierInvoiceStatus.RECHAZADA,
    SupplierInvoiceStatus.CONFIRMADA,
  ])('does not offer confirmation while status is %s', async (status) => {
    invoice = fixture(status);
    renderPage();
    await screen.findByText(invoice.invoiceNumber);
    expect(screen.queryByRole('button', { name: 'Confirmar factura' })).not.toBeInTheDocument();
  });

  it('closes the modal and refreshes authoritative state after a concurrent decision', async () => {
    reject.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DECISION_CONFLICT,
        },
      },
    });
    refetch.mockResolvedValue({ data: fixture(SupplierInvoiceStatus.RECHAZADA) });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    await user.type(screen.getByLabelText('Motivo del rechazo'), 'Ya fue revisada');
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('estado autoritativo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('closes confirmation and refreshes after a concurrent confirmation', async () => {
    invoice = fixture(SupplierInvoiceStatus.AUTORIZADA);
    confirm.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONFIRMATION_CONFLICT,
        },
      },
    });
    refetch.mockResolvedValue({ data: fixture(SupplierInvoiceStatus.CONFIRMADA) });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Confirmar factura' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y aplicar ajustes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('detalle autoritativo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps the confirmation dialog open so a recoverable error can be retried', async () => {
    invoice = fixture(SupplierInvoiceStatus.AUTORIZADA);
    confirm.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { message: 'Error interno', requestId: 'req-500' } },
    });
    const { user } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Confirmar factura' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y aplicar ajustes' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('req-500');
  });
});

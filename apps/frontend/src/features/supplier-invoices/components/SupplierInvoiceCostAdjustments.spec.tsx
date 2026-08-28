import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PriceReviewStatus,
  type ISupplierInvoiceConfirmation,
} from '../types/supplier-invoices.types';
import { SupplierInvoiceCostAdjustments } from './SupplierInvoiceCostAdjustments';

const confirmation: ISupplierInvoiceConfirmation = {
  confirmedAt: '2026-08-27T20:00:00.000Z',
  confirmedBy: { id: 'admin', name: 'Administrador', email: 'admin@erp.com' },
  stockRevaluationTotal: '70.0000',
  cogsAdjustmentTotal: '30.0000',
  adjustments: [
    {
      id: 'adjustment-1',
      supplierInvoiceId: 'invoice-1',
      supplierInvoiceItemId: 'invoice-item-1',
      goodsReceiptId: 'receipt-1',
      goodsReceiptItemId: 'receipt-item-1',
      productId: 'product-1',
      productCode: '001',
      productName: 'Producto positivo',
      stockMovementId: 'movement-1',
      provisionalCostPurchaseUnitNet: '100.0000',
      realCostPurchaseUnitNet: '110.0000',
      conversionFactor: '10.0000',
      provisionalCostBaseUnitNet: '10.0000',
      realCostBaseUnitNet: '11.0000',
      costDifferenceUnitNet: '1.0000',
      invoicedQtyBase: '100.00',
      layerStartQtyBase: '0.00',
      layerEndQtyBase: '100.00',
      onHandAllocatedQty: '70.00',
      consumedAllocatedQty: '30.00',
      stockRevaluation: '70.0000',
      cogsAdjustment: '30.0000',
      previousProductCostNet: '10.0000',
      newProductCostNet: '11.0000',
      appliedAt: '2026-08-27T20:00:00.000Z',
    },
    {
      id: 'adjustment-2',
      supplierInvoiceId: 'invoice-1',
      supplierInvoiceItemId: 'invoice-item-2',
      goodsReceiptId: 'receipt-1',
      goodsReceiptItemId: 'receipt-item-2',
      productId: 'product-2',
      productCode: '002',
      productName: 'Producto negativo',
      stockMovementId: 'movement-2',
      provisionalCostPurchaseUnitNet: '50.0000',
      realCostPurchaseUnitNet: '45.0000',
      conversionFactor: '5.0000',
      provisionalCostBaseUnitNet: '10.0000',
      realCostBaseUnitNet: '9.0000',
      costDifferenceUnitNet: '-1.0000',
      invoicedQtyBase: '20.00',
      layerStartQtyBase: '0.00',
      layerEndQtyBase: '20.00',
      onHandAllocatedQty: '0.00',
      consumedAllocatedQty: '20.00',
      stockRevaluation: '0.0000',
      cogsAdjustment: '-20.0000',
      previousProductCostNet: '10.0000',
      newProductCostNet: '9.0000',
      appliedAt: '2026-08-27T20:00:00.000Z',
    },
  ],
  priceReviews: [
    {
      id: 'review-1',
      supplierInvoiceId: 'invoice-1',
      productId: 'product-1',
      productCode: '001',
      productName: 'Producto positivo',
      previousCostNet: '10.0000',
      newCostNet: '11.0000',
      markupPercentageSnapshot: '50.0000',
      effectiveMarkupLevel: null,
      effectiveMarkupConfigurationId: null,
      effectiveMarkupTargetId: null,
      effectiveMarkupTargetName: null,
      previousSuggestedPriceNet: '15.0000',
      suggestedPriceNet: '16.5000',
      activePriceNetSnapshot: '14.0000',
      approvedPriceNet: null,
      status: PriceReviewStatus.PENDIENTE,
      decisionAction: null,
      decisionReason: null,
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: '2026-08-27T20:00:00.000Z',
      updatedAt: '2026-08-27T20:00:00.000Z',
    },
  ],
};

describe('SupplierInvoiceCostAdjustments', () => {
  it('renders authoritative 70/30 allocation and signed monetary impacts', () => {
    render(<SupplierInvoiceCostAdjustments confirmation={confirmation} />);
    expect(screen.getAllByText('+$ 70,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+$ 30,00').length).toBeGreaterThan(0);

    const adjustmentsTable = screen.getByRole('table');
    const positiveRow = within(adjustmentsTable).getByText('Producto positivo').closest('tr');
    expect(positiveRow).not.toBeNull();
    expect(within(positiveRow!).getByText('70,00')).toBeInTheDocument();
    expect(within(positiveRow!).getByText('30,00')).toBeInTheDocument();

    const negativeRow = within(adjustmentsTable).getByText('Producto negativo').closest('tr');
    expect(negativeRow).not.toBeNull();
    expect(within(negativeRow!).getAllByText('-$ 1,00').length).toBeGreaterThan(0);
    expect(within(negativeRow!).getByText('-$ 20,00')).toBeInTheDocument();
    expect(within(negativeRow!).getAllByLabelText('Disminución').length).toBeGreaterThan(0);
  });

  it('shows the pending review and states that active price and stock quantities are unchanged', () => {
    render(<SupplierInvoiceCostAdjustments confirmation={confirmation} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Precio activo sin cambios')).toBeInTheDocument();
    expect(screen.getByText('$ 14,00')).toBeInTheDocument();
    expect(
      screen.getByText(/cantidades de stock y sus movimientos no fueron modificados/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /aprobar|rechazar|posponer/i }),
    ).not.toBeInTheDocument();
  });
});

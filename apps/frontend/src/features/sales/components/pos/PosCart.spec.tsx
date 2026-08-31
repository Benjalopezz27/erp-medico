import {
  CustomerPricingRuleApplied,
  ProductTaxTreatment,
  type IResolvedCustomerPrice,
} from '@erp/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import type { PosPreviewLine } from '../../types/sales.types';
import { PosCart } from './PosCart';

function line(ruleApplied: CustomerPricingRuleApplied, index: number): PosPreviewLine {
  const pricing: IResolvedCustomerPrice = {
    customerId: '10000000-0000-4000-8000-000000000001',
    customerBusinessName: 'Cliente',
    productId: `30000000-0000-4000-8000-00000000000${index}`,
    productCode: `P00${index}`,
    productName: `Producto ${index}`,
    basePriceNet: '100.00',
    ruleApplied,
    ruleId: null,
    discountPercentage: null,
    discountAmountNet: null,
    finalPriceNet: '90.00',
  };
  return {
    product: {
      id: pricing.productId,
      internalCode: pricing.productCode,
      name: pricing.productName,
      baseUnit: { id: 'unit', name: 'Unidad', symbol: 'un' },
      currentStock: 5,
      activePriceNet: 100,
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: 21,
    },
    quantityBase: 1,
    pricing,
    catalogPriceNet: '100.00',
    finalPriceNet: '90.00',
    subtotalNet: '90.00',
    taxTreatment: ProductTaxTreatment.GRAVADO,
    ivaPercentage: '21',
    ivaAmount: '18.90',
    subtotalGross: '108.90',
    isResolving: false,
    hasPricingError: false,
  };
}

describe('PosCart', () => {
  it('shows all four read-only pricing conditions', () => {
    renderWithProviders(
      <PosCart
        lines={Object.values(CustomerPricingRuleApplied).map(line)}
        disabled={false}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
        onRetryPricing={vi.fn()}
      />,
    );
    expect(screen.getByText('Precio fijo especial')).toBeInTheDocument();
    expect(screen.getByText('Descuento por producto')).toBeInTheDocument();
    expect(screen.getByText('Descuento general')).toBeInTheDocument();
    expect(screen.getByText('Precio de catálogo')).toBeInTheDocument();
  });

  it('warns without blocking when quantity exceeds visible stock', () => {
    const stockLine = line(CustomerPricingRuleApplied.CATALOG_PRICE, 1);
    stockLine.quantityBase = 6;
    renderWithProviders(
      <PosCart
        lines={[stockLine]}
        disabled={false}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
        onRetryPricing={vi.fn()}
      />,
    );
    expect(screen.getByText('Supera el stock visible')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad de Producto 1')).not.toBeDisabled();
  });
});

import {
  CustomerDocumentType,
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
  TaxCondition,
} from '@erp/shared-types';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerGeneralDiscountModal } from './CustomerGeneralDiscountModal';
import { CustomerSpecialPriceDeleteModal } from './CustomerSpecialPriceDeleteModal';

const updateCustomer = vi.fn();
const deleteRule = vi.fn();
vi.mock('@/features/customers/hooks/use-customer-mutations', () => ({
  useUpdateCustomerMutation: () => ({ mutateAsync: updateCustomer, isPending: false }),
}));
vi.mock('../hooks/use-customer-pricing-mutations', () => ({
  useDeleteCustomerSpecialPriceMutation: () => ({ mutateAsync: deleteRule, isPending: false }),
}));

const customer = {
  id: 'customer-1',
  businessName: 'Farmacia',
  documentType: CustomerDocumentType.DNI,
  cuitOrDni: '35123456',
  taxCondition: TaxCondition.CONSUMIDOR_FINAL,
  email: null,
  phone: null,
  address: null,
  creditLimit: '0.00',
  generalDiscountPercentage: '5.0000',
  isActive: true,
  createdAt: '2026-08-28',
  updatedAt: '2026-08-28',
};
const rule = {
  id: 'rule-1',
  customerId: customer.id,
  productId: 'product-1',
  productCode: 'P001',
  productName: 'Jeringa',
  activeCatalogPriceNet: '100.00',
  mode: CustomerSpecialPriceMode.FIXED_PRICE,
  specialPriceNet: '80.00',
  discountPercentage: null,
  finalPriceNet: '80.00',
  version: 1,
  createdAt: '2026-08-28',
  updatedAt: '2026-08-28',
};

describe('customer pricing confirmation modals', () => {
  it('updates the general discount after showing its qualitative impact', async () => {
    updateCustomer.mockResolvedValue({ ...customer, generalDiscountPercentage: '10.0000' });
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CustomerGeneralDiscountModal
        customer={customer}
        isOpen
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );
    expect(screen.getByText(/productos sin una excepción específica/i)).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: /descuento general/i });
    await user.clear(input);
    await user.type(input, '10');
    await user.click(screen.getByRole('button', { name: /confirmar cambio/i }));
    expect(updateCustomer).toHaveBeenCalledWith({
      id: customer.id,
      payload: { generalDiscountPercentage: '10.0000' },
    });
  });

  it('reports the authoritative fallback returned after deletion', async () => {
    deleteRule.mockResolvedValue({
      id: rule.id,
      productId: rule.productId,
      fallback: {
        customerId: customer.id,
        customerBusinessName: customer.businessName,
        productId: rule.productId,
        productCode: rule.productCode,
        productName: rule.productName,
        basePriceNet: '100.00',
        ruleApplied: CustomerPricingRuleApplied.GENERAL_DISCOUNT,
        ruleId: null,
        discountPercentage: '5.0000',
        discountAmountNet: '5.00',
        finalPriceNet: '95.00',
      },
    });
    const onSuccess = vi.fn();
    const { user } = renderWithProviders(
      <CustomerSpecialPriceDeleteModal
        customerId={customer.id}
        rule={rule}
        generalDiscountPercentage={customer.generalDiscountPercentage}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/descuento general de 5.0000%/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /eliminar excepción/i }));
    expect(deleteRule).toHaveBeenCalledWith({ id: rule.id, productId: rule.productId });
    expect(onSuccess).toHaveBeenCalledWith(expect.stringMatching(/descuento general.*95,00/i));
  });
});

import { CustomerSpecialPriceMode } from '@erp/shared-types';
import axios from 'axios';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerSpecialPriceFormModal } from './CustomerSpecialPriceFormModal';

const create = vi.fn();
const update = vi.fn();
vi.mock('../hooks/use-customer-pricing-mutations', () => ({
  useCreateCustomerSpecialPriceMutation: () => ({ mutateAsync: create, isPending: false }),
  useUpdateCustomerSpecialPriceMutation: () => ({ mutateAsync: update, isPending: false }),
}));
vi.mock('@/features/products/components/ProductSearchInput', () => ({
  ProductSearchInput: ({
    onSelect,
    excludeIds,
  }: {
    onSelect: (product: unknown) => void;
    excludeIds: string[];
  }) => (
    <button
      type="button"
      onClick={() => onSelect({ id: 'product-new', internalCode: 'P002', name: 'Guantes' })}
    >
      Seleccionar producto ({excludeIds.join(',')})
    </button>
  ),
}));

const common = {
  customerId: 'customer-1',
  isOpen: true,
  excludeProductIds: ['product-old'],
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  onRefresh: vi.fn(),
};

describe('CustomerSpecialPriceFormModal', () => {
  it('creates a fixed price without sending a discount', async () => {
    create.mockResolvedValue({});
    const { user } = renderWithProviders(<CustomerSpecialPriceFormModal {...common} rule={null} />);
    await user.click(screen.getByRole('button', { name: /seleccionar producto \(product-old\)/i }));
    await user.type(screen.getByLabelText(/precio neto fijo/i), '125.5');
    await user.click(screen.getByRole('button', { name: /guardar excepción/i }));
    expect(create).toHaveBeenCalledWith({
      productId: 'product-new',
      mode: CustomerSpecialPriceMode.FIXED_PRICE,
      specialPriceNet: '125.50',
    });
  });

  it('updates a product discount with the last read version', async () => {
    update.mockResolvedValue({});
    const rule = {
      id: 'rule-1',
      customerId: 'customer-1',
      productId: 'product-old',
      productCode: 'P001',
      productName: 'Jeringa',
      activeCatalogPriceNet: '100.00',
      mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
      specialPriceNet: null,
      discountPercentage: '5.0000',
      finalPriceNet: '95.00',
      version: 3,
      createdAt: '2026-08-28',
      updatedAt: '2026-08-28',
    };
    const { user } = renderWithProviders(<CustomerSpecialPriceFormModal {...common} rule={rule} />);
    const input = screen.getByLabelText(/descuento \(%\)/i);
    await user.clear(input);
    await user.type(input, '10');
    await user.click(screen.getByRole('button', { name: /guardar excepción/i }));
    expect(update).toHaveBeenCalledWith({
      id: 'rule-1',
      payload: {
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        expectedVersion: 3,
        discountPercentage: '10.0000',
      },
    });
  });

  it('reloads the authoritative rule and version after a concurrency conflict', async () => {
    const rule = {
      id: 'rule-1',
      customerId: 'customer-1',
      productId: 'product-old',
      productCode: 'P001',
      productName: 'Jeringa',
      activeCatalogPriceNet: '100.00',
      mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
      specialPriceNet: null,
      discountPercentage: '5.0000',
      finalPriceNet: '95.00',
      version: 3,
      createdAt: '2026-08-28',
      updatedAt: '2026-08-28',
    };
    const currentRule = { ...rule, discountPercentage: '7.0000', version: 4 };
    update
      .mockRejectedValueOnce(
        new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: { headers: {} } as never,
          data: {
            code: 'CUSTOMER_SPECIAL_PRICE_CONCURRENCY_CONFLICT',
            details: { currentRule },
          },
        }),
      )
      .mockResolvedValueOnce(currentRule);
    const { user } = renderWithProviders(<CustomerSpecialPriceFormModal {...common} rule={rule} />);
    await user.click(screen.getByRole('button', { name: /guardar excepción/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/otra persona modificó/i);
    expect(screen.getByRole('textbox', { name: /descuento/i })).toHaveValue('7.0000');
    await user.click(screen.getByRole('button', { name: /guardar excepción/i }));
    expect(update).toHaveBeenLastCalledWith({
      id: 'rule-1',
      payload: {
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        expectedVersion: 4,
        discountPercentage: '7.0000',
      },
    });
  });
});

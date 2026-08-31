import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { PaymentMethod, ProductTaxTreatment, SaleStatus, type ISale } from '@erp/shared-types';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { SalesNewPage } from './SalesNewPage';

const product = {
  id: '30000000-0000-4000-8000-000000000001',
  internalCode: 'P001',
  name: 'Jeringa',
  baseUnit: { id: 'u1', name: 'Unidad', symbol: 'un' },
  currentStock: 10,
  activePriceNet: 100,
  taxTreatment: ProductTaxTreatment.GRAVADO,
  ivaPercentage: 21,
};
const sale = {
  id: '40000000-0000-4000-8000-000000000001',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: '50000000-0000-4000-8000-000000000001', name: 'Vendedor' },
  status: SaleStatus.CONFIRMADA,
  isCreditSale: false,
  requiresFiscalInvoice: false,
  paymentMethod: PaymentMethod.EFECTIVO,
  totalNet: '100.00',
  taxableNet: '100.00',
  exemptAmount: '0.00',
  nonTaxedAmount: '0.00',
  ivaTotal: '21.00',
  totalGross: '121.00',
  userId: '50000000-0000-4000-8000-000000000001',
  items: [],
  fiscalDocument: null,
  accountReceivable: null,
  createdAt: '2026-08-31',
  updatedAt: '2026-08-31',
} satisfies ISale;
const mutateAsync = vi.fn().mockResolvedValue(sale);

vi.mock('@/features/products/components/ProductSearchInput', () => ({
  ProductSearchInput: ({ onSelect }: { onSelect: (selected: typeof product) => void }) => (
    <button type="button" onClick={() => onSelect(product)}>
      Agregar producto
    </button>
  ),
}));
vi.mock('@/features/sales/hooks/use-create-sale-mutation', () => ({
  useCreateSaleMutation: () => ({ mutateAsync, isPending: false }),
}));

describe('SalesNewPage', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(sale);
  });

  it('builds a cash preview, sends minimum payload and shows the authoritative result', async () => {
    const router = createTestRouter(
      [{ path: '/sales/new', component: SalesNewPage }],
      '/sales/new',
    );
    const { user } = renderWithRouter({ router });
    await user.click(await screen.findByRole('button', { name: 'Agregar producto' }));
    expect(screen.getByText('Jeringa')).toBeInTheDocument();
    expect(screen.getAllByText(/121,00/)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Confirmar venta' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      customerId: null,
      isCreditSale: false,
      requiresFiscalInvoice: false,
      paymentMethod: PaymentMethod.EFECTIVO,
      items: [{ productId: product.id, quantityBase: 1 }],
    });
    expect(await screen.findByText('V-00000001')).toBeInTheDocument();
  });

  it('forces invoice and current account when credit is selected', async () => {
    const router = createTestRouter(
      [{ path: '/sales/new', component: SalesNewPage }],
      '/sales/new',
    );
    const { user } = renderWithRouter({ router });
    await user.click(await screen.findByLabelText('Venta a crédito'));
    expect(screen.getByLabelText(/Requiere factura/)).toBeChecked();
    expect(screen.getByLabelText('Medio de pago')).toHaveValue(PaymentMethod.CTA_CTE);
  });

  it('ignores a second submit while the first confirmation is pending', async () => {
    let resolveSale!: (value: ISale) => void;
    mutateAsync.mockReturnValueOnce(new Promise<ISale>((resolve) => (resolveSale = resolve)));
    const router = createTestRouter(
      [{ path: '/sales/new', component: SalesNewPage }],
      '/sales/new',
    );
    const { user } = renderWithRouter({ router });
    await user.click(await screen.findByRole('button', { name: 'Agregar producto' }));
    await user.dblClick(screen.getByRole('button', { name: 'Confirmar venta' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    resolveSale(sale);
    expect(await screen.findByText('V-00000001')).toBeInTheDocument();
  });
});

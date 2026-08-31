import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import {
  ArcaStatus,
  PaymentMethod,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  SaleStatus,
  UserRole,
  type ISale,
  type ISaleReturn,
} from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { SaleReturnsHistoryTable } from './SaleReturnsHistoryTable';

const mockSale: ISale = {
  id: 'sale-1',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: 'u1', name: 'Vendedor' },
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
  userId: 'u1',
  fiscalDocument: null,
  accountReceivable: null,
  createdAt: '2026-08-31T12:00:00Z',
  updatedAt: '2026-08-31T12:00:00Z',
  items: [],
};

const mockReturn: ISaleReturn = {
  id: 'ret-1111-2222',
  saleId: 'sale-1',
  userId: 'u1',
  user: { id: 'u1', name: 'Juan Vendedor' },
  reason: 'Empaque roto',
  taxableNet: '50.00',
  exemptAmount: '0.00',
  nonTaxedAmount: '0.00',
  totalNet: '50.00',
  ivaTotal: '10.50',
  totalGross: '60.50',
  fiscalDocument: {
    id: 'f-1',
    saleId: 'sale-1',
    documentType: null,
    pointOfSale: null,
    documentNumber: null,
    arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    cae: null,
  },
  createdAt: '2026-08-31T14:00:00Z',
  items: [
    {
      id: 'ri-1',
      saleReturnId: 'ret-1111-2222',
      saleItemId: 'item-1',
      productId: 'prod-1',
      quantityBase: 2,
      unitPriceNet: '25.00',
      subtotalNet: '50.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      ivaAmount: '10.50',
      subtotalGross: '60.50',
      quality: SaleReturnItemQuality.NO_APTO,
      notes: 'Envase dañado',
      stockMovementId: null,
      quarantineStockId: 'q-1',
      product: { id: 'prod-1', internalCode: 'P001', name: 'Guantes Quirúrgicos' },
      createdAt: '2026-08-31T14:00:00Z',
    },
  ],
};

describe('SaleReturnsHistoryTable', () => {
  it('renders empty state when there are no returns', async () => {
    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnsHistoryTable
            sale={mockSale}
            returns={[]}
            isLoading={false}
            isError={false}
            onRetry={() => {}}
          />
        ),
      },
    ]);
    renderWithRouter({ router });
    expect(await screen.findByText(/No hay devoluciones registradas/i)).toBeInTheDocument();
  });

  it('renders past return with quality, reason and credit note badge', async () => {
    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnsHistoryTable
            sale={mockSale}
            returns={[mockReturn]}
            isLoading={false}
            isError={false}
            onRetry={() => {}}
          />
        ),
      },
    ]);
    renderWithRouter({ router });
    expect(await screen.findByText(/Devolución #ret-1111/i)).toBeInTheDocument();
    expect(screen.getByText(/Juan Vendedor/i)).toBeInTheDocument();
    expect(screen.getByText(/Empaque roto/i)).toBeInTheDocument();
    expect(screen.getByText(/Guantes Quirúrgicos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cuarentena/i)).toBeInTheDocument();
    expect(screen.getByText(/Envase dañado/i)).toBeInTheDocument();
  });

  it('renders link to quarantine for ADMINISTRADOR role', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'admin@erp.com',
        name: 'Admin',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
      isAuthenticated: true,
    });

    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnsHistoryTable
            sale={mockSale}
            returns={[mockReturn]}
            isLoading={false}
            isError={false}
            onRetry={() => {}}
          />
        ),
      },
    ]);
    renderWithRouter({ router });
    expect(await screen.findByRole('link', { name: /Ver lote/i })).toBeInTheDocument();
  });

  it('does not render link to quarantine for VENDEDOR role', async () => {
    useAuthStore.setState({
      user: {
        id: 'u2',
        email: 'vendedor@erp.com',
        name: 'Vendedor',
        role: UserRole.VENDEDOR,
        isActive: true,
      },
      isAuthenticated: true,
    });

    const router = createTestRouter([
      {
        path: '/',
        component: () => (
          <SaleReturnsHistoryTable
            sale={mockSale}
            returns={[mockReturn]}
            isLoading={false}
            isError={false}
            onRetry={() => {}}
          />
        ),
      },
    ]);
    renderWithRouter({ router });
    expect(await screen.findByText(/Aislado/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver lote/i })).not.toBeInTheDocument();
  });
});

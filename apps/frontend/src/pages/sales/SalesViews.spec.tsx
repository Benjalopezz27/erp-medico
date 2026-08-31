import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import {
  ArcaStatus,
  CustomerPricingRuleApplied,
  PaymentMethod,
  ProductTaxTreatment,
  SaleStatus,
  type ISale,
} from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { validateSaleSearchParams } from '@/features/sales/schemas/sales.schema';
import { SalesListPage } from './SalesListPage';
import { SaleDetailPage } from './SaleDetailPage';

const sale = {
  id: '40000000-0000-4000-8000-000000000001',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: '50000000-0000-4000-8000-000000000001', name: 'Vendedor Uno' },
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
  items: [
    {
      id: '60000000-0000-4000-8000-000000000001',
      saleId: '40000000-0000-4000-8000-000000000001',
      productId: '30000000-0000-4000-8000-000000000001',
      itemIndex: 0,
      quantityBase: 1,
      catalogPriceNet: '110.00',
      pricingRuleApplied: CustomerPricingRuleApplied.PRODUCT_DISCOUNT,
      pricingRuleId: '70000000-0000-4000-8000-000000000001',
      discountPercentage: '9.0909',
      discountAmountNet: '10.00',
      unitPriceNet: '100.00',
      subtotalNet: '100.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      ivaAmount: '21.00',
      subtotalGross: '121.00',
      product: {
        id: '30000000-0000-4000-8000-000000000001',
        internalCode: 'P001',
        name: 'Jeringa histórica',
      },
    },
  ],
  fiscalDocument: {
    id: '80000000-0000-4000-8000-000000000001',
    saleId: '40000000-0000-4000-8000-000000000001',
    documentType: null,
    pointOfSale: null,
    documentNumber: null,
    arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    cae: null,
  },
  accountReceivable: null,
  createdAt: '2026-08-31T12:00:00Z',
  updatedAt: '2026-08-31T12:00:00Z',
} satisfies ISale;

describe('sales history and detail pages', () => {
  it('renders URL-filtered history and fiscal state', async () => {
    server.use(
      http.get('*/api/v1/sales', ({ request }) => {
        expect(new URL(request.url).searchParams.get('status')).toBe(SaleStatus.CONFIRMADA);
        return HttpResponse.json({
          data: [sale],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );
    const router = createTestRouter(
      [{ path: '/sales', component: SalesListPage, validateSearch: validateSaleSearchParams }],
      '/sales?page=1&limit=20&status=CONFIRMADA',
    );
    renderWithRouter({ router });
    expect(await screen.findByText('V-00000001')).toBeInTheDocument();
    expect(screen.getByText('Consumidor final')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders immutable item snapshots and authoritative totals', async () => {
    server.use(
      http.get('*/api/v1/sales/:id', () => HttpResponse.json(sale)),
      http.get('*/api/v1/sales/:id/returns', () => HttpResponse.json([])),
    );
    const router = createTestRouter(
      [{ path: '/sales/$id', component: SaleDetailPage }],
      `/sales/${sale.id}`,
    );
    renderWithRouter({ router });
    expect(await screen.findByText('Jeringa histórica')).toBeInTheDocument();
    expect(screen.getByText('Desc. producto')).toBeInTheDocument();
    expect(screen.getByText('Vendedor Uno')).toBeInTheDocument();
    expect(screen.getAllByText(/121,00/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Registrar devolución/i })).toBeInTheDocument();
    expect(screen.getByText(/Historial de devoluciones y control de calidad/i)).toBeInTheDocument();
  });
});

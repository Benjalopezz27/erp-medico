import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, TaxCondition, type ISupplier, type IUnit } from '@erp/shared-types';
import { SupplierCatalogPage } from './SupplierCatalogPage';
import { validateSupplierCatalogSearchParams } from '@/router';
import type { ISupplierProduct } from '@/features/supplier-products/types/supplier-products.types';

const mockSupplierId = '00000000-0000-0000-0000-000000000001';
const mockBaseUnitId = '11111111-1111-1111-1111-111111111111';
const mockPackUnitId = '22222222-2222-2222-2222-222222222222';
const mockProductId = '33333333-3333-3333-3333-333333333333';

const mockSupplierActive: ISupplier = {
  id: mockSupplierId,
  businessName: 'Droguería del Sol S.A.',
  cuit: '30500010912',
  taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  email: 'contacto@drogueriadelsol.com',
  phone: '0351-4890123',
  whatsapp: '5493514890123',
  address: 'Av. Colón 1234, Córdoba',
  isActive: true,
  createdAt: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T10:00:00.000Z',
};

const mockSupplierInactive: ISupplier = {
  ...mockSupplierActive,
  isActive: false,
};

const mockUnits: IUnit[] = [
  {
    id: mockBaseUnitId,
    name: 'Unidad',
    symbol: 'u',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  },
  {
    id: mockPackUnitId,
    name: 'Caja',
    symbol: 'cj',
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  },
];

const mockCatalogItems: ISupplierProduct[] = [
  {
    id: 'sp-001',
    supplierId: mockSupplierId,
    productId: mockProductId,
    supplierExternalCode: 'SOL-AMOX-500',
    supplierDescription: 'Amoxicilina 500 x 20 caps',
    purchaseUnitId: mockPackUnitId,
    conversionFactorToBase: 20,
    usualCostNet: 1200.5,
    isPrimarySupplier: true,
    product: {
      id: mockProductId,
      internalCode: 'P0001',
      name: 'Amoxicilina 500 mg',
      baseUnit: {
        id: mockBaseUnitId,
        name: 'Unidad',
        symbol: 'u',
      },
    },
    purchaseUnit: {
      id: mockPackUnitId,
      name: 'Caja',
      symbol: 'cj',
    },
    createdAt: '2026-08-25T10:00:00.000Z',
    updatedAt: '2026-08-25T10:00:00.000Z',
  },
  {
    id: 'sp-002',
    supplierId: mockSupplierId,
    productId: '44444444-4444-4444-4444-444444444444',
    supplierExternalCode: 'SOL-IBU-400',
    supplierDescription: 'Ibuprofeno 400 x 10',
    purchaseUnitId: mockBaseUnitId,
    conversionFactorToBase: 1,
    usualCostNet: null,
    isPrimarySupplier: false,
    product: {
      id: '44444444-4444-4444-4444-444444444444',
      internalCode: 'P0002',
      name: 'Ibuprofeno 400 mg',
      baseUnit: {
        id: mockBaseUnitId,
        name: 'Unidad',
        symbol: 'u',
      },
    },
    purchaseUnit: {
      id: mockBaseUnitId,
      name: 'Unidad',
      symbol: 'u',
    },
    createdAt: '2026-08-25T11:00:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z',
  },
];

function renderSupplierCatalogPage(
  supplierId = mockSupplierId,
  initialPath = `/suppliers/${supplierId}/catalog`,
) {
  const router = createTestRouter(
    [
      {
        path: '/suppliers',
        component: () => <div data-testid="suppliers-list-page">Listado de Proveedores</div>,
      },
      {
        path: '/suppliers/$supplierId/catalog',
        component: SupplierCatalogPage,
        validateSearch: validateSupplierCatalogSearchParams,
      },
    ],
    initialPath,
    'app',
  );

  return renderWithRouter({ router });
}

describe('SupplierCatalogPage Integration Suite', () => {
  const baseUrl = getApiUrl();

  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    useAuthStore.getState().setSession({
      accessToken: 'test-token',
      user: {
        id: 'admin-id',
        name: 'Admin User',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });

    server.use(
      http.get(`${baseUrl}/suppliers/${mockSupplierId}`, () => {
        return HttpResponse.json(mockSupplierActive);
      }),
      http.get(`${baseUrl}/units`, () => {
        return HttpResponse.json(mockUnits);
      }),
      http.get(`${baseUrl}/suppliers/${mockSupplierId}/products`, () => {
        return HttpResponse.json({
          data: mockCatalogItems,
          meta: {
            total: mockCatalogItems.length,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
      http.get(`${baseUrl}/products`, () => {
        return HttpResponse.json({
          data: [
            {
              id: mockProductId,
              internalCode: 'P0001',
              name: 'Amoxicilina 500 mg',
              baseUnit: {
                id: mockBaseUnitId,
                name: 'Unidad',
                symbol: 'u',
              },
              currentStock: 100,
              activePriceNet: 250,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        });
      }),
      http.get(`${baseUrl}/products/search`, () => {
        return HttpResponse.json([
          {
            id: mockProductId,
            internalCode: 'P0001',
            name: 'Amoxicilina 500 mg',
            baseUnit: {
              id: mockBaseUnitId,
              name: 'Unidad',
              symbol: 'u',
            },
            currentStock: 100,
            activePriceNet: 250,
          },
        ]);
      }),
    );
  });

  it('renders page header with supplier business name, formatted CUIT, and catalog table', async () => {
    renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText(/Catálogo: Droguería del Sol S.A./i)).toBeInTheDocument();
    });

    expect(screen.getByText('30-50001091-2')).toBeInTheDocument();
    expect(screen.getByText('SOL-AMOX-500')).toBeInTheDocument();
    expect(screen.getByText('SOL-IBU-400')).toBeInTheDocument();
    expect(screen.getByText('P0001 — Amoxicilina 500 mg')).toBeInTheDocument();
    expect(screen.getByText('P0002 — Ibuprofeno 400 mg')).toBeInTheDocument();
    expect(screen.getAllByText('Habitual').length).toBeGreaterThan(0);

    // Invariant check: Assert that the dictionary table does not render master product costNet or currentStock columns
    const tableHeader = screen.getByRole('table');
    expect(within(tableHeader).queryByText(/Stock Actual/i)).not.toBeInTheDocument();
    expect(within(tableHeader).queryByText(/Precio Venta/i)).not.toBeInTheDocument();
  });

  it('navigates back to /suppliers on clicking Volver button', async () => {
    const { user } = renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText(/Catálogo: Droguería del Sol S.A./i)).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /volver al listado/i });
    await user.click(backBtn);

    await waitFor(() => {
      expect(screen.getByTestId('suppliers-list-page')).toBeInTheDocument();
    });
  });

  it('filters catalog by search input with debounce', async () => {
    let capturedSearch: string | null = null;
    server.use(
      http.get(`${baseUrl}/suppliers/${mockSupplierId}/products`, ({ request }) => {
        const url = new URL(request.url);
        capturedSearch = url.searchParams.get('search');
        return HttpResponse.json({
          data: capturedSearch ? [mockCatalogItems[0]] : mockCatalogItems,
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );

    const { user } = renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText('SOL-AMOX-500')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por sku/i);
    await user.type(searchInput, 'AMOX');

    await waitFor(() => {
      expect(capturedSearch).toBe('AMOX');
    });
  });

  it('opens create modal, submits new product mapping and displays success feedback', async () => {
    let postedPayload: any = null;
    server.use(
      http.post(`${baseUrl}/suppliers/${mockSupplierId}/products`, async ({ request }) => {
        postedPayload = await request.json();
        return HttpResponse.json(
          {
            ...mockCatalogItems[0],
            id: 'sp-new-001',
            supplierExternalCode: postedPayload.supplierExternalCode,
          },
          { status: 201 },
        );
      }),
    );

    const { user } = renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText(/Catálogo: Droguería del Sol S.A./i)).toBeInTheDocument();
    });

    const associateBtn = screen.getByRole('button', { name: /asociar producto/i });
    await user.click(associateBtn);

    expect(
      screen.getByRole('heading', { name: /asociar producto al catálogo/i }),
    ).toBeInTheDocument();

    // Select product via autocomplete
    const productSearch = screen.getByPlaceholderText(/buscar por código.*o nombre/i);
    await user.type(productSearch, 'Amoxi');

    await waitFor(() => {
      expect(screen.getByText('Amoxicilina 500 mg')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Amoxicilina 500 mg'));

    // Fill SKU
    const skuInput = screen.getByLabelText(/código \/ sku de proveedor/i);
    await user.type(skuInput, 'PROV-NEW-99');

    // Select purchase unit (Caja)
    const unitSelect = screen.getByLabelText(/unidad de compra/i);
    await user.selectOptions(unitSelect, mockPackUnitId);

    // Enter conversion factor
    const factorInput = screen.getByLabelText(/factor de conversión a unidad base/i);
    await user.clear(factorInput);
    await user.type(factorInput, '50');

    // Submit
    const submitButtons = screen.getAllByRole('button', { name: /^asociar producto$/i });
    const submitBtn =
      submitButtons.find((btn) => btn.getAttribute('type') === 'submit') || submitButtons[1];
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/producto asociado exitosamente/i)).toBeInTheDocument();
    });

    expect(postedPayload).toMatchObject({
      supplierExternalCode: 'PROV-NEW-99',
      productId: mockProductId,
      purchaseUnitId: mockPackUnitId,
      conversionFactorToBase: 50,
    });
  });

  it('opens edit modal with preloaded values, displays read-only product and submits updates', async () => {
    let patchedPayload: any = null;
    server.use(
      http.patch(`${baseUrl}/suppliers/${mockSupplierId}/products/sp-001`, async ({ request }) => {
        patchedPayload = await request.json();
        return HttpResponse.json({
          ...mockCatalogItems[0],
          supplierDescription: patchedPayload.supplierDescription,
        });
      }),
    );

    const { user } = renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText('SOL-AMOX-500')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole('button', { name: /^editar$/i });
    await user.click(editBtns[0]);

    expect(
      screen.getByRole('heading', { name: /editar asociación de catálogo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('P0001')).toBeInTheDocument();

    const descInput = screen.getByLabelText(/descripción del proveedor/i);
    await user.clear(descInput);
    await user.type(descInput, 'Descripción actualizada');

    const saveBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/asociación de producto actualizada/i)).toBeInTheDocument();
    });

    expect(patchedPayload).toMatchObject({
      supplierDescription: 'Descripción actualizada',
    });
  });

  it('opens delete modal and confirms physical deletion', async () => {
    let deletedId: string | null = null;
    server.use(
      http.delete(`${baseUrl}/suppliers/${mockSupplierId}/products/:id`, ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { user } = renderSupplierCatalogPage();

    await waitFor(() => {
      expect(screen.getByText('SOL-AMOX-500')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByRole('button', { name: /^eliminar$/i });
    await user.click(deleteBtns[0]);

    expect(
      screen.getByRole('heading', { name: /eliminar asociación de catálogo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/¿estás seguro de eliminar esta asociación\?/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^confirmar eliminación$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/eliminada correctamente/i)).toBeInTheDocument();
    });

    expect(deletedId).toBe('sp-001');
  });

  it('displays read-only warning and disables associate/edit for inactive supplier', async () => {
    server.use(
      http.get(`${baseUrl}/suppliers/${mockSupplierId}`, () => {
        return HttpResponse.json(mockSupplierInactive);
      }),
    );

    renderSupplierCatalogPage();

    await waitFor(() => {
      expect(
        screen.getByText(/proveedor inactivo \(modo solo lectura parcial\)/i),
      ).toBeInTheDocument();
    });

    const associateBtn = screen.getByRole('button', { name: /asociar producto/i });
    expect(associateBtn).toBeDisabled();

    const editBtns = screen.getAllByRole('button', { name: /^editar$/i });
    editBtns.forEach((btn) => expect(btn).toBeDisabled());

    const deleteBtns = screen.getAllByRole('button', { name: /^eliminar$/i });
    deleteBtns.forEach((btn) => expect(btn).not.toBeDisabled());
  });
});

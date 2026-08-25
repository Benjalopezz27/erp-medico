import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, TaxCondition, type ISupplier } from '@erp/shared-types';
import { SuppliersPage } from './SuppliersPage';
import { validateSuppliersSearchParams } from '@/router';

const mockSuppliers: ISupplier[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
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
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    businessName: 'Laboratorios Córdoba S.R.L.',
    cuit: '30711425809',
    taxCondition: TaxCondition.MONOTRIBUTO,
    email: 'ventas@labcordoba.com',
    phone: '0351-4567890',
    whatsapp: null,
    address: 'Bv. San Juan 567',
    isActive: false,
    createdAt: '2026-08-25T11:00:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z',
  },
];

function renderSuppliersPage(initialPath = '/suppliers') {
  const router = createTestRouter(
    [
      {
        path: '/suppliers',
        component: SuppliersPage,
        validateSearch: validateSuppliersSearchParams,
      },
    ],
    initialPath,
    'app',
  );

  return renderWithRouter({ router });
}

describe('SuppliersPage Integration Suite', () => {
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
      http.get(`${baseUrl}/suppliers`, ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get('search')?.toLowerCase();
        const isActive = url.searchParams.get('isActive');

        let filtered = [...mockSuppliers];

        if (search) {
          filtered = filtered.filter(
            (s) => s.businessName.toLowerCase().includes(search) || s.cuit.includes(search),
          );
        }

        if (isActive !== null && isActive !== undefined) {
          const activeBool = isActive === 'true';
          filtered = filtered.filter((s) => s.isActive === activeBool);
        }

        return HttpResponse.json({
          data: filtered,
          meta: {
            total: filtered.length,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),

      http.post(`${baseUrl}/suppliers`, async ({ request }) => {
        const body = (await request.json()) as any;
        const newSupplier: ISupplier = {
          id: '00000000-0000-0000-0000-000000000003',
          businessName: body.businessName,
          cuit: body.cuit.replace(/\D/g, ''),
          taxCondition: body.taxCondition,
          email: body.email || null,
          phone: body.phone || null,
          whatsapp: body.whatsapp || null,
          address: body.address || null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return HttpResponse.json(newSupplier, { status: 201 });
      }),

      http.patch(`${baseUrl}/suppliers/:id`, async ({ params, request }) => {
        const body = (await request.json()) as any;
        const target = mockSuppliers.find((s) => s.id === params.id);
        const updated = {
          ...(target || mockSuppliers[0]),
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return HttpResponse.json(updated);
      }),

      http.delete(`${baseUrl}/suppliers/:id`, ({ params }) => {
        const target = mockSuppliers.find((s) => s.id === params.id);
        const deactivated = {
          ...(target || mockSuppliers[0]),
          isActive: false,
          updatedAt: new Date().toISOString(),
        };
        return HttpResponse.json(deactivated);
      }),
    );
  });

  it('renders page header, filters, and supplier table with formatted CUITs and badges', async () => {
    renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /gestión de proveedores/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /nuevo proveedor/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
    });

    // Formatted CUIT
    expect(screen.getByText('30-50001091-2')).toBeInTheDocument();
    expect(screen.getByText('30-71142580-9')).toBeInTheDocument();

    // Tax Condition Badges
    expect(screen.getByText('Resp. Inscripto')).toBeInTheDocument();
    expect(screen.getByText('Monotributo')).toBeInTheDocument();

    // Status Badges
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('filters suppliers by search input with debounce', async () => {
    const { user } = renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/buscar proveedores/i);
    await user.type(searchInput, 'Laboratorios');

    await waitFor(() => {
      expect(screen.queryByText('Droguería del Sol S.A.')).not.toBeInTheDocument();
      expect(screen.getByText('Laboratorios Córdoba S.R.L.')).toBeInTheDocument();
    });
  });

  it('filters suppliers by status select', async () => {
    const { user } = renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
      expect(screen.getByText('Laboratorios Córdoba S.R.L.')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/filtrar por estado/i);
    await user.selectOptions(statusSelect, 'true');

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
      expect(screen.queryByText('Laboratorios Córdoba S.R.L.')).not.toBeInTheDocument();
    });
  });

  it('opens create modal, submits new supplier and displays success feedback', async () => {
    const { user } = renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /nuevo proveedor/i });
    await user.click(createBtn);

    expect(screen.getByRole('heading', { name: /nuevo proveedor/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/ej: droguería del sol s\.a\./i);
    const cuitInput = screen.getByPlaceholderText(/30-50001091-2/i);

    await user.type(nameInput, 'Farmacéutica Central S.A.');
    await user.type(cuitInput, '20-12345678-6');

    const submitBtn = screen.getByRole('button', { name: /crear proveedor/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/proveedor registrado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('opens deactivate modal and confirms soft-delete', async () => {
    const { user } = renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText('Droguería del Sol S.A.')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByTitle('Desactivar proveedor');
    await user.click(deactivateBtn);

    expect(screen.getByRole('heading', { name: /desactivar proveedor/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^desactivar proveedor$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/fue desactivado/i)).toBeInTheDocument();
    });
  });

  it('reactivates inactive supplier on button click', async () => {
    const { user } = renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText('Laboratorios Córdoba S.R.L.')).toBeInTheDocument();
    });

    const reactivateBtn = screen.getByTitle('Reactivar proveedor');
    await user.click(reactivateBtn);

    await waitFor(() => {
      expect(screen.getByText(/fue reactivado exitosamente/i)).toBeInTheDocument();
    });
  });

  it('renders error banner when server fails and supports retry', async () => {
    server.use(
      http.get(`${baseUrl}/suppliers`, () => {
        return HttpResponse.json({ message: 'Database connection error' }, { status: 500 });
      }),
    );

    renderSuppliersPage();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar los proveedores/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

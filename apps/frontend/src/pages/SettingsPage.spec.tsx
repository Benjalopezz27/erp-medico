import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@erp/shared-types';
import { SettingsPage } from './SettingsPage';

const mockCategories = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Analgésicos',
    description: 'Medicamentos para el dolor',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Descartables',
    description: null,
    createdAt: '2026-08-21T11:00:00.000Z',
    updatedAt: '2026-08-21T11:00:00.000Z',
  },
];

const mockUnits = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Unidad',
    symbol: 'u',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Caja',
    symbol: 'cj',
    createdAt: '2026-08-21T11:00:00.000Z',
    updatedAt: '2026-08-21T11:00:00.000Z',
  },
];

function renderSettingsPage(role: UserRole = UserRole.ADMINISTRADOR) {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@erp.com',
      role,
      isActive: true,
    },
  });

  const router = createTestRouter([{ path: '/settings', component: SettingsPage }], '/settings');

  return renderWithRouter({ router });
}

describe('SettingsPage master catalog management', () => {
  const baseUrl = getApiUrl();

  beforeEach(() => {
    server.use(
      http.get(`${baseUrl}/categories`, () => {
        return HttpResponse.json(mockCategories);
      }),
      http.get(`${baseUrl}/units`, () => {
        return HttpResponse.json(mockUnits);
      }),
    );
  });

  describe('Tabs and Navigation', () => {
    it('renders page header and defaults to Categories tab', async () => {
      renderSettingsPage();

      expect(
        await screen.findByRole('heading', { name: 'Configuración del Sistema' }),
      ).toBeInTheDocument();

      // Check tab triggers
      expect(screen.getByRole('tab', { name: 'Categorías' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: 'Unidades de Medida' })).toHaveAttribute(
        'aria-selected',
        'false',
      );

      // Check category list rendered
      expect(await screen.findByText('Analgésicos')).toBeInTheDocument();
      expect(screen.getByText('Medicamentos para el dolor')).toBeInTheDocument();
      expect(screen.getByText('Descartables')).toBeInTheDocument();
    });

    it('switches to Units tab and displays unit records with formatted symbol badge', async () => {
      const { user } = renderSettingsPage();

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      const unitsTab = screen.getByRole('tab', { name: 'Unidades de Medida' });
      await user.click(unitsTab);

      expect(unitsTab).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('Unidad')).toBeInTheDocument();
      expect(screen.getByText('u')).toBeInTheDocument();
      expect(screen.getByText('Caja')).toBeInTheDocument();
      expect(screen.getByText('cj')).toBeInTheDocument();
    });
  });

  describe('Role-Aware Permissions & Visibility', () => {
    it('shows action buttons to administrators', async () => {
      renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      expect(await screen.findByRole('button', { name: 'Nueva Categoría' })).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Editar categoría Analgésicos' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Eliminar categoría Analgésicos' }),
      ).toBeInTheDocument();
    });

    it('hides all mutation controls from sellers (read-only view)', async () => {
      const { user } = renderSettingsPage(UserRole.VENDEDOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      // In Categories tab
      expect(await screen.findByText('Analgésicos')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Nueva Categoría' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Editar categoría Analgésicos' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Eliminar categoría Analgésicos' }),
      ).not.toBeInTheDocument();

      // Switch to Units tab
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));
      expect(await screen.findByText('Unidad')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Nueva Unidad' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Editar unidad Unidad' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Eliminar unidad Unidad' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Categories CRUD Operations', () => {
    it('creates a new category and displays success feedback', async () => {
      let createdPayload: any;
      server.use(
        http.post(`${baseUrl}/categories`, async ({ request }) => {
          createdPayload = await request.json();
          return HttpResponse.json(
            {
              id: '55555555-5555-5555-5555-555555555555',
              name: createdPayload.name,
              description: createdPayload.description || null,
              createdAt: '2026-08-21T12:00:00.000Z',
              updatedAt: '2026-08-21T12:00:00.000Z',
            },
            { status: 201 },
          );
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      await user.click(screen.getByRole('button', { name: 'Nueva Categoría' }));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Nueva Categoría' })).toBeInTheDocument();

      // Form validation
      const submitBtn = within(dialog).getByRole('button', {
        name: 'Crear Categoría',
      });
      await user.click(submitBtn);
      expect(
        await within(dialog).findByText('El nombre de la categoría es obligatorio'),
      ).toBeInTheDocument();

      // Fill in valid data
      await user.type(within(dialog).getByLabelText(/nombre de la categoría/i), 'Antibióticos');
      await user.type(within(dialog).getByLabelText(/descripción/i), 'Línea de antibióticos');

      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(createdPayload).toEqual({
        name: 'Antibióticos',
        description: 'Línea de antibióticos',
      });
      expect(screen.getByText('Categoría creada exitosamente.')).toBeInTheDocument();
    });

    it('shows inline conflict error on duplicate category name', async () => {
      server.use(
        http.post(`${baseUrl}/categories`, () => {
          return HttpResponse.json(
            {
              statusCode: 409,
              message: 'Ya existe una categoría con ese nombre',
              error: 'Conflict',
            },
            { status: 409 },
          );
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      await user.click(screen.getByRole('button', { name: 'Nueva Categoría' }));
      const dialog = screen.getByRole('dialog');

      await user.type(within(dialog).getByLabelText(/nombre de la categoría/i), 'Analgésicos');
      await user.click(within(dialog).getByRole('button', { name: 'Crear Categoría' }));

      expect(
        await within(dialog).findByText('Ya existe una categoría con ese nombre'),
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('edits an existing category and sends delta payload', async () => {
      let updatedPayload: any;
      server.use(
        http.patch(`${baseUrl}/categories/${mockCategories[0].id}`, async ({ request }) => {
          updatedPayload = await request.json();
          return HttpResponse.json({
            ...mockCategories[0],
            ...updatedPayload,
          });
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      const editBtn = await screen.findByRole('button', {
        name: `Editar categoría ${mockCategories[0].name}`,
      });
      await user.click(editBtn);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('heading', { name: 'Editar Categoría' })).toBeInTheDocument();

      const nameInput = within(dialog).getByLabelText(/nombre de la categoría/i);
      expect(nameInput).toHaveValue(mockCategories[0].name);

      // Save without changes
      const saveBtn = within(dialog).getByRole('button', {
        name: 'Guardar Cambios',
      });
      await user.click(saveBtn);
      expect(
        await within(dialog).findByText(
          'No se detectaron modificaciones en los datos de la categoría.',
        ),
      ).toBeInTheDocument();

      // Modify description only
      const descInput = within(dialog).getByLabelText(/descripción/i);
      await user.clear(descInput);
      await user.type(descInput, 'Nueva descripción modificada');

      await user.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(updatedPayload).toEqual({
        description: 'Nueva descripción modificada',
      });
      expect(screen.getByText('Categoría actualizada exitosamente.')).toBeInTheDocument();
    });

    it('deletes category on confirmation and handles foreign key 409 conflict', async () => {
      server.use(
        http.delete(`${baseUrl}/categories/${mockCategories[0].id}`, () => {
          return HttpResponse.json(
            {
              statusCode: 409,
              message:
                'No se puede eliminar la categoría porque está asociada a productos existentes',
              error: 'Conflict',
            },
            { status: 409 },
          );
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });

      const deleteBtn = await screen.findByRole('button', {
        name: `Eliminar categoría ${mockCategories[0].name}`,
      });
      await user.click(deleteBtn);

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Eliminar Categoría' }),
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Eliminar Categoría' }));

      expect(
        await within(dialog).findByText(
          'No se puede eliminar la categoría porque está asociada a productos existentes',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Units CRUD Operations', () => {
    it('creates a unit of measure and handles duplicate symbol conflict', async () => {
      server.use(
        http.post(`${baseUrl}/units`, () => {
          return HttpResponse.json(
            {
              statusCode: 409,
              message: 'Ya existe una unidad de medida con ese símbolo',
              error: 'Conflict',
            },
            { status: 409 },
          );
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));

      await user.click(screen.getByRole('button', { name: 'Nueva Unidad' }));

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Nueva Unidad de Medida' }),
      ).toBeInTheDocument();

      await user.type(within(dialog).getByLabelText(/nombre de la unidad/i), 'Caja Duplicada');
      await user.type(within(dialog).getByLabelText(/símbolo de la unidad/i), 'cj');

      await user.click(within(dialog).getByRole('button', { name: 'Crear Unidad' }));

      expect(
        await within(dialog).findByText('Ya existe una unidad de medida con ese símbolo'),
      ).toBeInTheDocument();
    });

    it('edits an existing unit of measure with delta payload', async () => {
      let updatedPayload: any;
      server.use(
        http.patch(`${baseUrl}/units/${mockUnits[0].id}`, async ({ request }) => {
          updatedPayload = await request.json();
          return HttpResponse.json({
            ...mockUnits[0],
            ...updatedPayload,
          });
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));

      const editBtn = await screen.findByRole('button', {
        name: `Editar unidad ${mockUnits[0].name}`,
      });
      await user.click(editBtn);

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Editar Unidad de Medida' }),
      ).toBeInTheDocument();

      // No changes notice
      const saveBtn = within(dialog).getByRole('button', { name: 'Guardar Cambios' });
      await user.click(saveBtn);
      expect(
        await within(dialog).findByText(
          'No se detectaron modificaciones en los datos de la unidad de medida.',
        ),
      ).toBeInTheDocument();

      // Modify symbol
      const symbolInput = within(dialog).getByLabelText(/símbolo de la unidad/i);
      await user.clear(symbolInput);
      await user.type(symbolInput, 'und');

      await user.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(updatedPayload).toEqual({ symbol: 'und' });
      expect(screen.getByText('Unidad de medida actualizada exitosamente.')).toBeInTheDocument();
    });

    it('deletes a unit of measure on confirmation', async () => {
      server.use(
        http.delete(`${baseUrl}/units/:id`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { user } = renderSettingsPage(UserRole.ADMINISTRADOR);

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));

      const deleteBtn = await screen.findByRole('button', {
        name: `Eliminar unidad ${mockUnits[0].name}`,
      });
      await user.click(deleteBtn);

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Eliminar Unidad de Medida' }),
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Eliminar Unidad' }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(
        screen.getByText(`Unidad de medida "${mockUnits[0].name}" eliminada exitosamente.`),
      ).toBeInTheDocument();
    });
  });

  describe('Error and Empty States', () => {
    it('displays error message and retry button when categories query fails', async () => {
      server.use(
        http.get(`${baseUrl}/categories`, () => {
          return HttpResponse.json({ statusCode: 500 }, { status: 500 });
        }),
      );

      renderSettingsPage();

      expect(await screen.findByText('No se pudieron cargar las categorías')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('displays empty state when catalog list is empty', async () => {
      server.use(
        http.get(`${baseUrl}/categories`, () => {
          return HttpResponse.json([]);
        }),
      );

      renderSettingsPage();

      expect(await screen.findByText('No hay categorías registradas')).toBeInTheDocument();
    });

    it('displays error message and retry button when units query fails', async () => {
      server.use(
        http.get(`${baseUrl}/units`, () => {
          return HttpResponse.json({ statusCode: 500 }, { status: 500 });
        }),
      );

      const { user } = renderSettingsPage();

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));

      expect(
        await screen.findByText('No se pudieron cargar las unidades de medida'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('displays empty state when units list is empty', async () => {
      server.use(
        http.get(`${baseUrl}/units`, () => {
          return HttpResponse.json([]);
        }),
      );

      const { user } = renderSettingsPage();

      await screen.findByRole('heading', { name: 'Configuración del Sistema' });
      await user.click(screen.getByRole('tab', { name: 'Unidades de Medida' }));

      expect(await screen.findByText('No hay unidades de medida registradas')).toBeInTheDocument();
    });
  });
});

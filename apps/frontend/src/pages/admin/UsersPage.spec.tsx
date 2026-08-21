import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { getApiUrl } from '@/config/api.config';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { UserRole, type IUser } from '@erp/shared-types';
import { UsersPage } from './UsersPage';
import { validateUserSearchParams } from '@/router';

const mockAdminUser: IUser = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Juan Admin',
  email: 'juan@erp.com',
  role: UserRole.ADMINISTRADOR,
  isActive: true,
  createdAt: '2026-08-15T10:00:00.000Z',
  updatedAt: '2026-08-15T10:00:00.000Z',
};

const mockSellerUser: IUser = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'Ana Ventas',
  email: 'ana@erp.com',
  role: UserRole.VENDEDOR,
  isActive: true,
  createdAt: '2026-08-16T11:00:00.000Z',
  updatedAt: '2026-08-16T11:00:00.000Z',
};

const mockInactiveUser: IUser = {
  id: '00000000-0000-0000-0000-000000000003',
  name: 'Carlos Inactivo',
  email: 'carlos@erp.com',
  role: UserRole.VENDEDOR,
  isActive: false,
  createdAt: '2026-08-17T12:00:00.000Z',
  updatedAt: '2026-08-17T12:00:00.000Z',
};

function renderUsersPage(initialPath = '/admin/users') {
  const router = createTestRouter(
    [
      {
        path: '/admin/users',
        component: UsersPage,
        validateSearch: validateUserSearchParams,
      },
    ],
    initialPath,
    'app',
  );

  return renderWithRouter({ router });
}

describe('UsersPage administrative user management', () => {
  const baseUrl = getApiUrl();

  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    useAuthStore.getState().setSession({
      accessToken: 'test-admin-token',
      user: {
        id: mockAdminUser.id,
        name: mockAdminUser.name,
        email: mockAdminUser.email,
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });
  });

  describe('Listing, Filters, and Pagination', () => {
    it('renders user list with role and status badges, and formatted dates', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser, mockSellerUser, mockInactiveUser],
            meta: {
              total: 3,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
      );

      renderUsersPage();

      expect(
        await screen.findByRole('heading', { name: 'Gestión de Usuarios' }),
      ).toBeInTheDocument();
      expect(await screen.findByText('Juan Admin')).toBeInTheDocument();
      expect(screen.getByText('Ana Ventas')).toBeInTheDocument();
      expect(screen.getByText('Carlos Inactivo')).toBeInTheDocument();

      // Check role & status badges
      expect(screen.getByText('ADMINISTRADOR')).toBeInTheDocument();
      expect(screen.getAllByText('VENDEDOR')).toHaveLength(2);
      expect(screen.getAllByText('Activo')).toHaveLength(2);
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });

    it('renders informative empty state when no users are returned', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [],
            meta: {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
      );

      renderUsersPage();

      expect(await screen.findByText('No se encontraron usuarios')).toBeInTheDocument();
      expect(
        screen.getByText('No hay registros que coincidan con los filtros aplicados.'),
      ).toBeInTheDocument();
    });

    it('handles search input with debounce and resets page to 1', async () => {
      let requestedUrl = '';
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json({
            data: [mockSellerUser],
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

      const { user } = renderUsersPage('/admin/users?page=2');

      await screen.findByRole('heading', { name: 'Gestión de Usuarios' });
      const searchInput = screen.getByLabelText('Buscar usuarios');
      await user.type(searchInput, 'ana');

      await waitFor(() => {
        expect(requestedUrl).toContain('search=ana');
        expect(requestedUrl).toContain('page=1');
      });
    });

    it('filters by role and status, and resets filters on button click', async () => {
      let requestedUrl = '';
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json({
            data: [mockSellerUser],
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

      const { user } = renderUsersPage();

      await screen.findByRole('heading', { name: 'Gestión de Usuarios' });

      // Filter by role
      const roleSelect = screen.getByLabelText('Filtrar por rol');
      await user.selectOptions(roleSelect, UserRole.ADMINISTRADOR);

      await waitFor(() => {
        expect(requestedUrl).toContain('role=ADMINISTRADOR');
      });

      // Filter by status
      const statusSelect = screen.getByLabelText('Filtrar por estado');
      await user.selectOptions(statusSelect, 'false');

      await waitFor(() => {
        expect(requestedUrl).toContain('isActive=false');
      });

      // Reset filters button appears
      const resetBtn = screen.getByRole('button', { name: /restablecer/i });
      await user.click(resetBtn);

      await waitFor(() => {
        expect(requestedUrl).not.toContain('role=ADMINISTRADOR');
        expect(requestedUrl).not.toContain('isActive=false');
      });
    });

    it('navigates pages and changes page limit', async () => {
      let requestedUrl = '';
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          requestedUrl = request.url;
          return HttpResponse.json({
            data: [mockAdminUser, mockSellerUser],
            meta: {
              total: 20,
              page: 1,
              limit: 10,
              totalPages: 2,
              hasNextPage: true,
              hasPreviousPage: false,
            },
          });
        }),
      );

      const { user } = renderUsersPage();

      await screen.findByRole('heading', { name: 'Gestión de Usuarios' });
      expect(
        await screen.findByText((_, el) => el?.textContent === 'Página 1 de 2'),
      ).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: 'Página siguiente' });
      await user.click(nextBtn);

      await waitFor(() => {
        expect(requestedUrl).toContain('page=2');
      });

      const limitSelect = screen.getByLabelText('Registros por página');
      await user.selectOptions(limitSelect, '25');

      await waitFor(() => {
        expect(requestedUrl).toContain('limit=25');
        expect(requestedUrl).toContain('page=1');
      });
    });

    it('corrects out-of-bounds page to last valid page upon receiving fresh data', async () => {
      let requestedUrl = '';
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          requestedUrl = request.url;
          const url = new URL(request.url);
          const page = Number(url.searchParams.get('page')) || 1;
          return HttpResponse.json({
            data: [mockAdminUser],
            meta: {
              total: 5,
              page,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: page > 1,
            },
          });
        }),
      );

      renderUsersPage('/admin/users?page=5');

      await screen.findByRole('heading', { name: 'Gestión de Usuarios' });

      await waitFor(() => {
        expect(requestedUrl).toContain('page=1');
        expect(
          screen.getByText((_, el) => el?.textContent === 'Página 1 de 1'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('User Creation Flow', () => {
    it('opens create modal, validates required inputs, and submits successfully', async () => {
      let postBody: any;
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser],
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
        http.post(`${baseUrl}/users`, async ({ request }) => {
          postBody = await request.json();
          return HttpResponse.json(
            {
              id: 'new-user-id',
              name: postBody.name,
              email: postBody.email,
              role: postBody.role,
              isActive: true,
              createdAt: '2026-08-21T10:00:00.000Z',
              updatedAt: '2026-08-21T10:00:00.000Z',
            },
            { status: 201 },
          );
        }),
      );

      const { user } = renderUsersPage();

      const createBtn = await screen.findByRole('button', { name: /nuevo usuario/i });
      await user.click(createBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole('heading', { name: 'Nuevo Usuario' })).toBeInTheDocument();

      // Submit empty -> validation triggers
      const submitBtn = within(dialog).getByRole('button', { name: 'Crear Usuario' });
      await user.click(submitBtn);

      expect(await within(dialog).findByText('El nombre es obligatorio')).toBeInTheDocument();
      expect(within(dialog).getByText('El correo electrónico es obligatorio')).toBeInTheDocument();
      expect(
        within(dialog).getByText('La contraseña debe tener al menos 8 caracteres'),
      ).toBeInTheDocument();

      // Fill in valid data
      await user.type(within(dialog).getByLabelText(/nombre completo/i), 'Nuevo Vendedor');
      await user.type(within(dialog).getByLabelText(/correo electrónico/i), 'nuevo@erp.com');
      await user.type(within(dialog).getByLabelText(/contraseña inicial/i), 'Password123!');
      await user.selectOptions(
        within(dialog).getByLabelText(/rol en el sistema/i),
        UserRole.VENDEDOR,
      );

      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(postBody).toEqual({
        name: 'Nuevo Vendedor',
        email: 'nuevo@erp.com',
        password: 'Password123!',
        role: UserRole.VENDEDOR,
      });
      expect(screen.getByText('Usuario creado exitosamente.')).toBeInTheDocument();
    });

    it('displays inline conflict error banner on 409 duplicate email without closing modal', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser],
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
        http.post(`${baseUrl}/users`, () => {
          return HttpResponse.json(
            {
              statusCode: 409,
              message: 'User with email "juan@erp.com" already exists',
              error: 'Conflict',
            },
            { status: 409 },
          );
        }),
      );

      const { user } = renderUsersPage();

      const createBtn = await screen.findByRole('button', { name: /nuevo usuario/i });
      await user.click(createBtn);

      const dialog = screen.getByRole('dialog');

      await user.type(within(dialog).getByLabelText(/nombre completo/i), 'Duplicado');
      await user.type(within(dialog).getByLabelText(/correo electrónico/i), 'juan@erp.com');
      await user.type(within(dialog).getByLabelText(/contraseña inicial/i), 'Password123!');

      await user.click(within(dialog).getByRole('button', { name: 'Crear Usuario' }));

      expect(
        await within(dialog).findByText(
          'El correo electrónico ingresado ya está registrado por otro usuario.',
        ),
      ).toBeInTheDocument();

      // Modal stays open and preserves input values
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(within(dialog).getByLabelText(/nombre completo/i)).toHaveValue('Duplicado');
    });
  });

  describe('User Editing Flow', () => {
    it('opens edit modal preloaded without password, prevents no-op, and submits delta payload', async () => {
      let patchBody: any;
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockSellerUser],
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
        http.patch(`${baseUrl}/users/:id`, async ({ request }) => {
          patchBody = await request.json();
          return HttpResponse.json({
            ...mockSellerUser,
            ...patchBody,
          });
        }),
      );

      const { user } = renderUsersPage();

      const editBtn = await screen.findByRole('button', {
        name: `Editar a ${mockSellerUser.name}`,
      });
      await user.click(editBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole('heading', { name: 'Editar Usuario' })).toBeInTheDocument();

      // Password field must NOT exist in edit modal
      expect(within(dialog).queryByLabelText(/contraseña/i)).not.toBeInTheDocument();

      // Values preloaded
      const nameInput = within(dialog).getByLabelText(/nombre completo/i);
      expect(nameInput).toHaveValue('Ana Ventas');

      // Submit unchanged -> no-op message
      const saveBtn = within(dialog).getByRole('button', { name: 'Guardar Cambios' });
      await user.click(saveBtn);

      expect(
        await within(dialog).findByText(
          'No se detectaron modificaciones en los datos del usuario.',
        ),
      ).toBeInTheDocument();

      // Modify name only
      await user.clear(nameInput);
      await user.type(nameInput, 'Ana Ventas Modificada');
      await user.click(saveBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(patchBody).toEqual({
        name: 'Ana Ventas Modificada',
      });
      expect(screen.getByText('Usuario actualizado exitosamente.')).toBeInTheDocument();
    });
  });

  describe('Deactivation, Self-Protection, and Invariants', () => {
    it('replaces deactivation action with Tu cuenta badge for authenticated user', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser, mockSellerUser],
            meta: {
              total: 2,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
      );

      renderUsersPage();

      await screen.findByText('Juan Admin');

      // Authenticated user row has 'Tu cuenta' badge and no deactivate button
      expect(screen.getByText('Tu cuenta')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: `Desactivar a ${mockAdminUser.name}` }),
      ).not.toBeInTheDocument();

      // Other user has active deactivate button
      expect(
        screen.getByRole('button', { name: `Desactivar a ${mockSellerUser.name}` }),
      ).toBeInTheDocument();
    });

    it('shows confirmation modal on deactivation and cancels without calling API', async () => {
      let deleteCalled = false;
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser, mockSellerUser],
            meta: {
              total: 2,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
        http.delete(`${baseUrl}/users/:id`, () => {
          deleteCalled = true;
          return HttpResponse.json({ ...mockSellerUser, isActive: false });
        }),
      );

      const { user } = renderUsersPage();

      const deactivateBtn = await screen.findByRole('button', {
        name: `Desactivar a ${mockSellerUser.name}`,
      });
      await user.click(deactivateBtn);

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByRole('heading', { name: 'Desactivar Usuario' }),
      ).toBeInTheDocument();

      // Click Cancel
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(deleteCalled).toBe(false);
    });

    it('executes soft delete on confirmation and displays success message', async () => {
      let deleteTargetId = '';
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser, mockSellerUser],
            meta: {
              total: 2,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
        http.delete(`${baseUrl}/users/:id`, ({ params }) => {
          deleteTargetId = params.id as string;
          return HttpResponse.json({ ...mockSellerUser, isActive: false });
        }),
      );

      const { user } = renderUsersPage();

      const deactivateBtn = await screen.findByRole('button', {
        name: `Desactivar a ${mockSellerUser.name}`,
      });
      await user.click(deactivateBtn);

      const dialog = screen.getByRole('dialog');
      const confirmBtn = within(dialog).getByRole('button', { name: 'Desactivar Usuario' });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(deleteTargetId).toBe(mockSellerUser.id);
      expect(
        screen.getByText(`El usuario "${mockSellerUser.name}" fue desactivado exitosamente.`),
      ).toBeInTheDocument();
    });

    it('displays actionable error message when backend rejects last admin deactivation', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockSellerUser],
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
        http.delete(`${baseUrl}/users/:id`, () => {
          return HttpResponse.json(
            {
              statusCode: 409,
              message: 'Cannot deactivate the last remaining active administrator',
              error: 'Conflict',
            },
            { status: 409 },
          );
        }),
      );

      const { user } = renderUsersPage();

      const deactivateBtn = await screen.findByRole('button', {
        name: `Desactivar a ${mockSellerUser.name}`,
      });
      await user.click(deactivateBtn);

      const dialog = screen.getByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Desactivar Usuario' }));

      expect(
        await within(dialog).findByText(
          'No es posible desactivar ni cambiar el rol del último administrador activo del sistema.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Reactivation Flow', () => {
    it('reactivates inactive user on button click and shows feedback', async () => {
      let patchBody: any;
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [mockAdminUser, mockInactiveUser],
            meta: {
              total: 2,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }),
        http.patch(`${baseUrl}/users/:id`, async ({ request }) => {
          patchBody = await request.json();
          return HttpResponse.json({
            ...mockInactiveUser,
            isActive: true,
          });
        }),
      );

      const { user } = renderUsersPage();

      const reactivateBtn = await screen.findByRole('button', {
        name: `Reactivar a ${mockInactiveUser.name}`,
      });
      await user.click(reactivateBtn);

      await waitFor(() => {
        expect(patchBody).toEqual({ isActive: true });
      });

      expect(
        screen.getByText(`El usuario "${mockInactiveUser.name}" fue reactivado exitosamente.`),
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling and Security', () => {
    it('renders error banner with retry button on query failure', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json(
            { statusCode: 500, message: 'Internal Server Error' },
            { status: 500 },
          );
        }),
      );

      renderUsersPage();

      expect(await screen.findByText('No se pudieron cargar los usuarios')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });

    it('does not render sensitive hashes, tokens, or audit secrets in the DOM', async () => {
      server.use(
        http.get(`${baseUrl}/users`, () => {
          return HttpResponse.json({
            data: [
              {
                ...mockAdminUser,
                passwordHash: '$2b$12$eX4mpL3H4sHNotToBeExpos3dInDOM',
                token: 'secret-token-value',
              },
            ],
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

      renderUsersPage();

      await screen.findByText('Juan Admin');

      expect(screen.queryByText(/\$2b\$12/)).not.toBeInTheDocument();
      expect(screen.queryByText(/secret-token-value/)).not.toBeInTheDocument();
    });
  });
});

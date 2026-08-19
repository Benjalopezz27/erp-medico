import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { UserRole, type IAuthSession } from '@erp/shared-types';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DEFAULT_API_URL } from '@/config/api.config';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from './LoginPage';

const session: IAuthSession = {
  accessToken: 'backend-signed-token',
  user: {
    id: 'admin-id',
    name: 'Admin ERP',
    email: 'admin@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  },
};

function renderLogin() {
  const router = createTestRouter(
    [
      { path: '/login', component: LoginPage },
      { path: '/', component: () => <h1>Dashboard privado</h1> },
    ],
    '/login',
  );
  return { router, ...renderWithRouter({ router }) };
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', DEFAULT_API_URL);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it('starts empty and validates fields without calling the API', async () => {
    const request = vi.fn();
    server.use(
      http.post(DEFAULT_API_URL + '/auth/login', () => {
        request();
        return HttpResponse.json(session);
      }),
    );
    const { user } = renderLogin();

    await user.click(await screen.findByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('El correo electrónico es requerido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('normalizes credentials, stores the real session and navigates to root', async () => {
    let submittedBody: unknown;
    server.use(
      http.post(DEFAULT_API_URL + '/auth/login', async ({ request }) => {
        submittedBody = await request.json();
        await delay(50);
        return HttpResponse.json(session);
      }),
    );
    const { user, router } = renderLogin();

    await user.type(await screen.findByLabelText(/correo electrónico/i), '  ADMIN@ERP.COM  ');
    await user.type(screen.getByLabelText(/contraseña/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(submittedBody).toEqual({ email: 'admin@erp.com', password: 'Secret123!' });
    expect(useAuthStore.getState()).toMatchObject({
      user: session.user,
      token: session.accessToken,
      isAuthenticated: true,
    });
  });

  it('shows a generic message for invalid credentials', async () => {
    server.use(
      http.post(DEFAULT_API_URL + '/auth/login', () => new HttpResponse(null, { status: 401 })),
    );
    const { user } = renderLogin();

    await user.type(await screen.findByLabelText(/correo electrónico/i), 'admin@erp.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('shows a connection message when the backend is unavailable', async () => {
    server.use(http.post(DEFAULT_API_URL + '/auth/login', () => HttpResponse.error()));
    const { user } = renderLogin();

    await user.type(await screen.findByLabelText(/correo electrónico/i), 'admin@erp.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(
      await screen.findByText('No se pudo conectar con el servidor. Intente nuevamente.'),
    ).toBeInTheDocument();
  });
});

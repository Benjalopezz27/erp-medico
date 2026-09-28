import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DEFAULT_API_URL } from '@/config/api.config';
import { useAuthStore } from '@/stores/authStore';
import { SignupPage } from './SignupPage';

function renderSignup() {
  const router = createTestRouter(
    [
      { path: '/signup', component: SignupPage },
      { path: '/login', component: () => <h1>Login</h1> },
    ],
    '/signup',
  );
  return renderWithRouter({ router });
}

async function fill(user: ReturnType<typeof renderSignup>['user'], password = 'Secret123!') {
  await user.type(await screen.findByLabelText('Nombre completo'), 'Nuevo Usuario');
  await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@erp.com');
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.type(screen.getByLabelText('Confirmar contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', DEFAULT_API_URL);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it('validates fields inline without calling the API', async () => {
    const request = vi.fn();
    server.use(
      http.post(DEFAULT_API_URL + '/auth/register', () => {
        request();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const { user } = renderSignup();
    await fill(user, 'weak');

    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('flags mismatched confirmation', async () => {
    const { user } = renderSignup();
    await user.type(await screen.findByLabelText('Nombre completo'), 'Nuevo');
    await user.type(screen.getByLabelText('Correo electrónico'), 'nuevo@erp.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Other123!');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('shows pending-approval message on success and creates no session', async () => {
    let body: unknown;
    server.use(
      http.post(DEFAULT_API_URL + '/auth/register', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      }),
    );
    const { user } = renderSignup();
    await fill(user);

    expect(await screen.findByText(/pendiente de aprobación/i)).toBeInTheDocument();
    expect(body).toEqual({ name: 'Nuevo Usuario', email: 'nuevo@erp.com', password: 'Secret123!' });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it.each([
    [409, /ya existe una cuenta/i],
    [429, /demasiados intentos/i],
  ])('maps API status %i to a specific message', async (status, message) => {
    server.use(
      http.post(DEFAULT_API_URL + '/auth/register', () => new HttpResponse(null, { status })),
    );
    const { user } = renderSignup();
    await fill(user);

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { UserRole } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DEFAULT_API_URL } from '@/config/api.config';
import { useAuthStore } from '@/stores/authStore';
import { AccountPage } from './AccountPage';

const sessionUser = {
  id: 'user-id',
  name: 'Carlos Gomez',
  email: 'carlos@erp.com',
  role: UserRole.VENDEDOR,
  isActive: true,
};

function renderAccount() {
  useAuthStore.getState().setSession({ accessToken: 'token', user: sessionUser });
  const router = createTestRouter([{ path: '/account', component: AccountPage }], '/account');
  return renderWithRouter({ router });
}

async function fillPasswords(
  user: ReturnType<typeof renderAccount>['user'],
  { current, next, confirm }: { current: string; next: string; confirm: string },
) {
  await user.type(await screen.findByLabelText('Contraseña actual'), current);
  await user.type(screen.getByLabelText('Nueva contraseña'), next);
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), confirm);
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
}

describe('AccountPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', DEFAULT_API_URL);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
  });

  it('shows email and role read-only', async () => {
    renderAccount();

    expect(await screen.findByLabelText('Correo electrónico')).toBeDisabled();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('carlos@erp.com');
    expect(screen.getByLabelText('Rol')).toHaveValue('Vendedor');
  });

  it('saves the name and refreshes the session user', async () => {
    let body: unknown;
    server.use(
      http.patch(DEFAULT_API_URL + '/users/me', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...sessionUser, name: 'Carlos G.' });
      }),
    );
    const { user } = renderAccount();

    const input = await screen.findByLabelText('Nombre');
    await user.clear(input);
    await user.type(input, 'Carlos G.');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(useAuthStore.getState().user?.name).toBe('Carlos G.'));
    expect(body).toEqual({ name: 'Carlos G.' });
  });

  it('does not call the API when the name is unchanged', async () => {
    const request = vi.fn();
    server.use(
      http.patch(DEFAULT_API_URL + '/users/me', () => {
        request();
        return HttpResponse.json(sessionUser);
      }),
    );
    const { user } = renderAccount();

    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled(),
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects an empty name without calling the API', async () => {
    const request = vi.fn();
    server.use(
      http.patch(DEFAULT_API_URL + '/users/me', () => {
        request();
        return HttpResponse.json(sessionUser);
      }),
    );
    const { user } = renderAccount();

    await user.clear(await screen.findByLabelText('Nombre'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('validates confirmation and password rules before calling the API', async () => {
    const request = vi.fn();
    server.use(
      http.post(DEFAULT_API_URL + '/users/me/change-password', () => {
        request();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderAccount();

    await fillPasswords(user, { current: 'Old12345!', next: 'Secret123!', confirm: 'Other123!' });
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Confirmar nueva contraseña'));
    await user.clear(screen.getByLabelText('Nueva contraseña'));
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Old12345!');
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Old12345!');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(
      await screen.findByText('La nueva contraseña debe ser distinta de la actual'),
    ).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('changes the password, clears the form and keeps the session', async () => {
    let body: unknown;
    server.use(
      http.post(DEFAULT_API_URL + '/users/me/change-password', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderAccount();

    await fillPasswords(user, { current: 'Old12345!', next: 'Secret123!', confirm: 'Secret123!' });

    await waitFor(() => expect(screen.getByLabelText('Contraseña actual')).toHaveValue(''));
    expect(body).toEqual({ currentPassword: 'Old12345!', newPassword: 'Secret123!' });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('keeps the session when the current password is wrong (400)', async () => {
    server.use(
      http.post(DEFAULT_API_URL + '/users/me/change-password', () =>
        HttpResponse.json({ message: 'Current password is incorrect' }, { status: 400 }),
      ),
    );
    const { user } = renderAccount();

    await fillPasswords(user, { current: 'Wrong123!', next: 'Secret123!', confirm: 'Secret123!' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeEnabled(),
    );
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('Wrong123!');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

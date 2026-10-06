import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DEFAULT_API_URL } from '@/config/api.config';
import { ResetPasswordPage } from './ResetPasswordPage';

function renderPage(token?: string) {
  const router = createTestRouter(
    [
      { path: '/reset-password', component: () => <ResetPasswordPage token={token} /> },
      { path: '/forgot-password', component: () => <h1>Forgot</h1> },
      { path: '/login', component: () => <h1>Login</h1> },
    ],
    '/reset-password',
  );
  return renderWithRouter({ router });
}

async function submit(user: ReturnType<typeof renderPage>['user'], password = 'Secret123!') {
  await user.type(await screen.findByLabelText('Contraseña nueva'), password);
  await user.type(screen.getByLabelText('Confirmar contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
}

describe('ResetPasswordPage', () => {
  beforeEach(() => vi.stubEnv('VITE_API_URL', DEFAULT_API_URL));

  it('shows invalid-token state with a link to request another when token is missing', async () => {
    renderPage(undefined);
    expect(await screen.findByText('Link inválido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toBeInTheDocument();
  });

  it('flags mismatched confirmation', async () => {
    const { user } = renderPage('tok');
    await user.type(await screen.findByLabelText('Contraseña nueva'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Other123!');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });

  it('sends token + new password and redirects to login on success', async () => {
    let body: unknown;
    server.use(
      http.post(DEFAULT_API_URL + '/auth/reset-password', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' });
      }),
    );
    const { user } = renderPage('tok');
    await submit(user);

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(body).toEqual({ token: 'tok', newPassword: 'Secret123!' });
  });

  it('switches to the invalid-token state on 400', async () => {
    server.use(
      http.post(
        DEFAULT_API_URL + '/auth/reset-password',
        () => new HttpResponse(null, { status: 400 }),
      ),
    );
    const { user } = renderPage('tok');
    await submit(user);

    expect(await screen.findByText('Link inválido')).toBeInTheDocument();
  });

  it('sets a no-referrer meta while mounted', async () => {
    renderPage('tok');
    await screen.findByLabelText('Contraseña nueva');
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'no-referrer',
    );
  });
});

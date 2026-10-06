import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { DEFAULT_API_URL } from '@/config/api.config';
import { ForgotPasswordPage } from './ForgotPasswordPage';

function renderPage() {
  const router = createTestRouter(
    [
      { path: '/forgot-password', component: ForgotPasswordPage },
      { path: '/login', component: () => <h1>Login</h1> },
    ],
    '/forgot-password',
  );
  return renderWithRouter({ router });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => vi.stubEnv('VITE_API_URL', DEFAULT_API_URL));

  it('rejects an invalid email without calling the API', async () => {
    const request = vi.fn();
    server.use(
      http.post(DEFAULT_API_URL + '/auth/forgot-password', () => {
        request();
        return HttpResponse.json({});
      }),
    );
    const { user } = renderPage();
    await user.type(await screen.findByLabelText('Correo electrónico'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText('Ingrese un correo electrónico válido')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('always shows the generic confirmation on success', async () => {
    let body: unknown;
    server.use(
      http.post(DEFAULT_API_URL + '/auth/forgot-password', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' });
      }),
    );
    const { user } = renderPage();
    await user.type(await screen.findByLabelText('Correo electrónico'), 'a@erp.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText(/si el email existe, te enviamos un link/i)).toBeInTheDocument();
    expect(body).toEqual({ email: 'a@erp.com' });
  });

  it('shows a rate-limit message on 429', async () => {
    server.use(
      http.post(
        DEFAULT_API_URL + '/auth/forgot-password',
        () => new HttpResponse(null, { status: 429 }),
      ),
    );
    const { user } = renderPage();
    await user.type(await screen.findByLabelText('Correo electrónico'), 'a@erp.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link' }));

    expect(await screen.findByText(/demasiados intentos/i)).toBeInTheDocument();
  });
});

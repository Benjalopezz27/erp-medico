import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { router } from '@/router';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { TermsView } from './TermsView';
import { TERMS_SECTIONS, TERMS_UPDATED_AT, TERMS_VERSION } from './terms.content';

describe('Terms and conditions', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('renders the public route without a session, with version, date and index', async () => {
    await router.navigate({ to: '/terms' });
    renderWithRouter({ router });

    expect(
      await screen.findByRole('heading', { name: 'Términos y condiciones' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${TERMS_VERSION}.*${TERMS_UPDATED_AT}`)),
    ).toBeInTheDocument();
    const index = screen.getByRole('navigation', { name: 'Secciones' });
    expect(index.querySelectorAll('a')).toHaveLength(TERMS_SECTIONS.length);
  });

  it.each([
    ['/login', LoginPage],
    ['/signup', SignupPage],
  ])('links to /terms from %s', async (path, component) => {
    const testRouter = createTestRouter(
      [
        { path, component },
        { path: '/terms', component: TermsView },
      ],
      path,
    );
    renderWithRouter({ router: testRouter });

    expect(await screen.findByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });
});

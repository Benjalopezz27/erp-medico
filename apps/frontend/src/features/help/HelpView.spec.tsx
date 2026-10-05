import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { HelpView } from './HelpView';
import { FAQ, HELP_SECTIONS } from './help.content';
import { SUPPORT_CONTACT } from './support.config';

function renderHelp() {
  const router = createTestRouter(
    [
      { path: '/help', component: HelpView },
      { path: '/terms', component: () => null },
      { path: '/account', component: () => null },
    ],
    '/help',
  );
  return renderWithRouter({ router });
}

describe('HelpView', () => {
  it('lists every section in the side index plus FAQ and contact', async () => {
    renderHelp();

    const index = await screen.findByRole('navigation', { name: 'Secciones de ayuda' });
    expect(index.querySelectorAll('a')).toHaveLength(HELP_SECTIONS.length + 2);
    for (const { title } of HELP_SECTIONS) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('renders FAQ as expandable items', async () => {
    const { user } = renderHelp();

    const first = await screen.findByText(FAQ[0]!.question);
    expect(screen.getByText(FAQ[0]!.answer)).not.toBeVisible();
    await user.click(first);
    expect(screen.getByText(FAQ[0]!.answer)).toBeVisible();
  });

  it('shows support contact, app version and the terms link', async () => {
    renderHelp();

    expect(await screen.findByText(new RegExp(SUPPORT_CONTACT.email))).toBeInTheDocument();
    expect(screen.getByText(/Versión de la app: \S+/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });
});

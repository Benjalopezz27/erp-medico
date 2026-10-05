import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesTable } from './CategoriesTable';

const categories = [
  { id: '1', name: 'Zeta', description: null, createdAt: '2026-01-02T00:00:00Z' },
  { id: '2', name: 'Alfa', description: 'x', createdAt: '2026-01-01T00:00:00Z' },
] as never;

describe('CategoriesTable sorting', () => {
  it('sorts by name ascending then descending', () => {
    render(
      <CategoriesTable
        categories={categories}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isAdmin={false}
      />,
    );
    const first = () => screen.getAllByRole('row')[1].firstChild?.textContent;
    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }));
    expect(first()).toBe('Alfa');
    fireEvent.click(screen.getByRole('button', { name: /Nombre/ }));
    expect(first()).toBe('Zeta');
  });
});

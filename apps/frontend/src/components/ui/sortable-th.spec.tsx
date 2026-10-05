import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortableTh } from './sortable-th';

function renderTh(props: Partial<React.ComponentProps<typeof SortableTh<'name'>>> = {}) {
  const onSort = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <SortableTh field="name" onSort={onSort} {...props}>
            Nombre
          </SortableTh>
        </tr>
      </thead>
    </table>,
  );
  return onSort;
}

describe('SortableTh', () => {
  it('exposes aria-sort for none, ascending and descending', () => {
    const { unmount } = render(
      <table>
        <thead>
          <tr>
            <SortableTh field="a" onSort={() => {}}>
              A
            </SortableTh>
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'none');
    unmount();
    renderTh({ sortBy: 'name', sortOrder: 'ASC' });
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('reports the field on click and on keyboard activation', async () => {
    const onSort = renderTh({ sortBy: 'name', sortOrder: 'DESC' });
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
    const button = screen.getByRole('button', { name: /nombre/i });
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onSort).toHaveBeenCalledTimes(3);
    expect(onSort).toHaveBeenCalledWith('name');
  });
});

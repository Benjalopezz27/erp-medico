import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarkupLevel } from '@erp/shared-types';
import { MarkupsList } from './MarkupsList';

const base = {
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  categoryId: null,
  categoryName: null,
  productId: null,
  productCode: null,
  productName: null,
};

describe('MarkupsList', () => {
  it('separates levels, makes global non-deletable and exposes empty states', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onCreate = vi.fn();
    render(
      <MarkupsList
        configurations={[
          { ...base, id: 'global', level: MarkupLevel.GLOBAL, percentage: '15.0000' },
        ]}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreate={onCreate}
      />,
    );
    expect(screen.getByText('OBLIGATORIO')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Eliminar markup de Base/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/No hay excepciones configuradas/)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: /Editar markup de Base/ }));
    expect(onEdit).toHaveBeenCalled();
    await user.click(screen.getAllByRole('button', { name: 'Nueva excepción' })[0]);
    expect(onCreate).toHaveBeenCalledWith(MarkupLevel.CATEGORY);
  });
});

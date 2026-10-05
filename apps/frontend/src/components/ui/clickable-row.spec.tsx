import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClickableRow } from './clickable-row';

function setup() {
  const onActivate = vi.fn();
  const onEdit = vi.fn();
  render(
    <table>
      <tbody>
        <ClickableRow onActivate={onActivate} aria-label="fila">
          <td>Celda</td>
          <td>
            <button onClick={onEdit}>Editar</button>
          </td>
        </ClickableRow>
      </tbody>
    </table>,
  );
  return { onActivate, onEdit };
}

describe('ClickableRow', () => {
  it('activates when any cell is clicked', async () => {
    const { onActivate } = setup();
    await userEvent.click(screen.getByText('Celda'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('does not activate when an inner button is clicked', async () => {
    const { onActivate, onEdit } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('activates with Enter when the row is focused', async () => {
    const { onActivate } = setup();
    screen.getByLabelText('fila').focus();
    await userEvent.keyboard('{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './modal';

const ModalTestHarness: React.FC<{
  initialOpen?: boolean;
  onClose?: () => void;
  description?: string;
}> = ({ initialOpen = true, onClose = vi.fn(), description = 'Modal description test' }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <div>
      <button id="open-btn" onClick={() => setIsOpen(true)}>
        Open Dialog
      </button>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Test Modal Title"
        description={description}
      >
        <div>
          <input data-testid="first-input" placeholder="First input" />
          <input data-testid="second-input" placeholder="Second input" />
          <button data-testid="action-btn">Submit</button>
        </div>
      </Modal>
    </div>
  );
};

describe('Modal accessibility and interaction', () => {
  it('renders dialog with ARIA attributes and labels', () => {
    render(<ModalTestHarness />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    expect(screen.getByText('Test Modal Title')).toBeInTheDocument();
    expect(screen.getByText('Modal description test')).toBeInTheDocument();
  });

  it('closes modal when pressing Escape key', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<ModalTestHarness onClose={handleClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus within the modal during Tab navigation', async () => {
    const user = userEvent.setup();
    render(<ModalTestHarness />);

    const closeBtn = screen.getByRole('button', { name: 'Cerrar modal' });
    const firstInput = screen.getByTestId('first-input');
    const secondInput = screen.getByTestId('second-input');
    const actionBtn = screen.getByTestId('action-btn');

    // First focusable element inside modal
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    await user.tab();
    expect(document.activeElement).toBe(firstInput);

    await user.tab();
    expect(document.activeElement).toBe(secondInput);

    await user.tab();
    expect(document.activeElement).toBe(actionBtn);

    // Tabbing from last element cycles back to first focusable element
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first element cycles to last element
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(actionBtn);
  });

  it('restores focus to trigger button when closed', async () => {
    const user = userEvent.setup();
    render(<ModalTestHarness initialOpen={false} />);

    const openBtn = screen.getByRole('button', { name: 'Open Dialog' });
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    await user.click(openBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Cerrar modal' });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openBtn);
  });
});

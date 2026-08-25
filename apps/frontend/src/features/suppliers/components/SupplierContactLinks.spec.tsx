import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupplierContactLinks } from './SupplierContactLinks';

describe('SupplierContactLinks Component', () => {
  it('renders safe mailto and whatsapp links when valid data is provided', () => {
    render(
      <SupplierContactLinks
        email="contacto@drogueria.com"
        phone="0351-4890123"
        whatsapp="5493514890123"
      />,
    );

    const emailLink = screen.getByRole('link', {
      name: /contacto@drogueria\.com/i,
    });
    expect(emailLink).toHaveAttribute('href', 'mailto:contacto%40drogueria.com');

    expect(screen.getByText('0351-4890123')).toBeInTheDocument();

    const waLink = screen.getByRole('link', {
      name: /5493514890123/i,
    });
    expect(waLink).toHaveAttribute('href', 'https://wa.me/5493514890123');
    expect(waLink).toHaveAttribute('target', '_blank');
    expect(waLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders plain text without anchor tags when email or whatsapp are invalid', () => {
    render(<SupplierContactLinks email="not-an-email" phone="0351-4890123" whatsapp="12345" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('not-an-email')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('renders a dash placeholder when all contact fields are missing', () => {
    render(<SupplierContactLinks email={null} phone={null} whatsapp={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyInput } from './money-input';

function Harness(props: Partial<React.ComponentProps<typeof MoneyInput>> & { initial?: string }) {
  const { initial = '', onValueChange, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <MoneyInput
      aria-label="monto"
      value={value}
      onValueChange={(raw) => {
        setValue(raw);
        onValueChange?.(raw);
      }}
      {...rest}
    />
  );
}

const input = () => screen.getByLabelText('monto') as HTMLInputElement;

describe('MoneyInput', () => {
  it('shows thousands separators and emits the raw value', async () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await userEvent.type(input(), '1500000');
    expect(input().value).toBe('1.500.000');
    expect(onValueChange).toHaveBeenLastCalledWith('1500000');
  });

  it('accepts a decimal comma', async () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await userEvent.type(input(), '1500000,5');
    expect(input().value).toBe('1.500.000,5');
    expect(onValueChange).toHaveBeenLastCalledWith('1500000.5');
  });

  it('keeps the decimal comma while typing it', async () => {
    render(<Harness />);
    await userEvent.type(input(), '12,');
    expect(input().value).toBe('12,');
  });

  it('parses pasted formatted text', async () => {
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    await userEvent.click(input());
    await userEvent.paste('1.500.000,5');
    expect(input().value).toBe('1.500.000,5');
    expect(onValueChange).toHaveBeenLastCalledWith('1500000.5');
  });

  it('parses pasted raw decimals', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.paste('1500000.5');
    expect(input().value).toBe('1.500.000,5');
  });

  it('keeps the cursor next to the edited digit', () => {
    render(<Harness initial="1500000" />);
    const el = input();
    el.setSelectionRange(3, 3); // "1.5|00.000"
    fireEvent.change(el, { target: { value: '1.59|00.000'.replace('|', ''), selectionStart: 4 } });
    expect(el.value).toBe('15.900.000');
  });

  it('rejects negatives by default and limits decimals', async () => {
    render(<Harness />);
    await userEvent.type(input(), '-10,999');
    expect(input().value).toBe('10,99');
  });

  it('allows negatives when enabled', async () => {
    render(<Harness allowNegative />);
    await userEvent.type(input(), '-5');
    expect(input().value).toBe('-5');
  });

  it('keeps the last valid value above max', async () => {
    render(<Harness max="999.99" />);
    await userEvent.type(input(), '9999');
    expect(input().value).toBe('999');
  });

  it('shows a compact magnitude hint from thousands', async () => {
    render(<Harness />);
    await userEvent.type(input(), '950');
    expect(screen.queryByTestId('money-magnitude')).toBeNull();
    await userEvent.clear(input());
    await userEvent.type(input(), '1500000');
    expect(screen.getByTestId('money-magnitude')).toHaveTextContent('1,5 M');
  });

  it('shows the dollar prefix', () => {
    render(<Harness />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });
});

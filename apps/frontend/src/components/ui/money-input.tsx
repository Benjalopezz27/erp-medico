import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';

// Matches numeric(14,2): the widest money column in the backend.
const DEFAULT_MAX = '99999999999999.99';
const MAGNITUDE_THRESHOLD = 1000;

export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  /** Raw numeric string (`"1500000.5"`), never the formatted text. */
  value: string | null | undefined;
  onValueChange: (raw: string) => void;
  decimals?: number;
  max?: string;
  allowNegative?: boolean;
  showMagnitude?: boolean;
}

const stripTrailingDot = (raw: string) => raw.replace(/\.$/, '');

function magnitudeHint(raw: string): string | null {
  const num = Number(stripTrailingDot(raw));
  if (!Number.isFinite(num) || Math.abs(num) < MAGNITUDE_THRESHOLD) return null;
  return new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 2 }).format(
    num,
  );
}

/** Position in `text` after `count` digits/commas, to restore the caret after reformatting. */
function caretFor(text: string, count: number): number {
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (seen === count) return i;
    if (/[\d,-]/.test(text[i])) seen += 1;
  }
  return text.length;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onValueChange,
      decimals = 2,
      max = DEFAULT_MAX,
      allowNegative = false,
      showMagnitude = true,
      className,
      onPaste,
      ...props
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const pendingCaret = React.useRef<number | null>(null);
    const pasted = React.useRef(false);
    // Keeps a trailing "." (typed decimal comma) that the emitted raw value drops.
    const [draft, setDraft] = React.useState(value ?? '');
    const current = value ?? '';
    const raw = stripTrailingDot(draft) === current ? draft : current;
    const display = formatMoneyInput(raw);
    const hint = showMagnitude ? magnitudeHint(raw) : null;

    React.useLayoutEffect(() => {
      if (pendingCaret.current === null || !innerRef.current) return;
      innerRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    });

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const text = event.target.value;
      const caret = event.target.selectionStart ?? text.length;
      const next = parseMoneyInput(text, { decimals, max, allowNegative, pasted: pasted.current });
      pasted.current = false;
      if (next === null) {
        // Rejected: re-render restores the previous text.
        setDraft(raw);
        return;
      }
      const nextDisplay = formatMoneyInput(next);
      pendingCaret.current = caretFor(
        nextDisplay,
        text.slice(0, caret).replace(/[^\d,-]/g, '').length,
      );
      setDraft(next);
      onValueChange(stripTrailingDot(next));
    };

    return (
      <div>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-slate-500"
          >
            $
          </span>
          <Input
            {...props}
            ref={setRefs}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={display}
            onChange={handleChange}
            onPaste={(event) => {
              pasted.current = true;
              onPaste?.(event);
            }}
            className={cn('pl-7 text-right', className)}
          />
        </div>
        {hint && (
          <p data-testid="money-magnitude" className="mt-1 text-right text-[11px] text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };

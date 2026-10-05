import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"]';

interface ClickableRowProps extends Omit<ComponentProps<'tr'>, 'onClick'> {
  /** Destination action. When omitted the row renders as a plain, non-interactive <tr>. */
  onActivate?: () => void;
}

/** Table row that opens its detail; clicks on inner buttons/links keep their own behavior. */
export function ClickableRow({ onActivate, className, children, ...props }: ClickableRowProps) {
  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    onActivate?.();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate?.();
    }
  };
  // Without a destination the row must not look clickable (no dead clicks).
  if (!onActivate) {
    return (
      <tr className={className} {...props}>
        {children}
      </tr>
    );
  }
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

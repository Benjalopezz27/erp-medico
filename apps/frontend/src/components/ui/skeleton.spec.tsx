import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a pulsing placeholder with the given className', () => {
    const { container } = render(<Skeleton className="h-4 w-full" data-testid="skeleton" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('animate-pulse', 'h-4', 'w-full');
  });
});

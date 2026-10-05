import type { ReactNode } from 'react';
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackLinkProps {
  /** Fallback destination when there is no in-app history (direct URL access). */
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  className?: string;
  /** Visible text, e.g. "Volver a Productos". */
  children: ReactNode;
}

/**
 * Consistent "Volver a …" control. With in-app history it goes back (restoring the previous
 * list filters, sort and page); otherwise it navigates to the explicit fallback.
 */
export function BackLink({ to, params, search, className, children }: BackLinkProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <Link
      to={to as never}
      params={params as never}
      search={search as never}
      onClick={(event) => {
        // Let the browser handle new-tab / new-window clicks and only intercept plain clicks.
        if (!canGoBack || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        router.history.back();
      }}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'sm' }),
        'gap-1.5 text-xs',
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { parseApiError } from '@/lib/errors/parse-api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
  // Mutations are deliberately left out: every mutation in this app already
  // shows its own inline error (mutateAsync + catch), so an automatic toast
  // here would just duplicate it. Queries rarely have their own error UI, so
  // this is the safety net for query failures — opt out per-query with
  // `meta: { skipGlobalErrorToast: true }` when a screen already handles it.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalErrorToast) return;
      toast.error(parseApiError(error).message);
    },
  }),
});

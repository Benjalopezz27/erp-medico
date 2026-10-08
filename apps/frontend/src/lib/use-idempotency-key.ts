import { useCallback, useRef } from 'react';

/**
 * Stable idempotency key for a form submission: the same payload keeps the
 * same key across retries (double click, ambiguous network error), while an
 * edited payload gets a new one. Call `reset` after the operation succeeds.
 */
export function useIdempotencyKey() {
  const current = useRef<{ fingerprint: string; key: string } | null>(null);

  const keyFor = useCallback((payload: unknown): string => {
    const fingerprint = JSON.stringify(payload);
    if (current.current?.fingerprint !== fingerprint) {
      current.current = { fingerprint, key: crypto.randomUUID() };
    }
    return current.current.key;
  }, []);

  const reset = useCallback(() => {
    current.current = null;
  }, []);

  return { keyFor, reset };
}

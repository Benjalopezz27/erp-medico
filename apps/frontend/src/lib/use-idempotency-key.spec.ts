import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKey } from './use-idempotency-key';

describe('useIdempotencyKey', () => {
  it('reuses the key for the same payload, changes it for another and after reset', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current.keyFor({ a: 1 });

    expect(result.current.keyFor({ a: 1 })).toBe(first);
    expect(result.current.keyFor({ a: 2 })).not.toBe(first);

    const second = result.current.keyFor({ a: 2 });
    result.current.reset();
    expect(result.current.keyFor({ a: 2 })).not.toBe(second);
  });
});

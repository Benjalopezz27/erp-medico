import { beforeEach, describe, expect, it, vi } from 'vitest';
import { privateRequestRegistry } from './private-request-registry';
import { sessionTerminator } from './session-terminator';

describe('session terminator', () => {
  beforeEach(() => {
    sessionTerminator.clearListeners();
    privateRequestRegistry.abortAll('test cleanup');
  });

  it('aborts private requests and delegates cleanup with the reason', async () => {
    const { signal, release } = privateRequestRegistry.createSignal();
    const handler = vi.fn();
    sessionTerminator.register(handler);

    await sessionTerminator.terminate('user_logout');

    expect(signal.aborted).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('user_logout');
    release();
  });

  it('coalesces concurrent termination requests into one cleanup', async () => {
    let finishCleanup: (() => void) | undefined;
    const handler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCleanup = resolve;
        }),
    );
    sessionTerminator.register(handler);

    const first = sessionTerminator.terminate('unauthorized_401');
    const second = sessionTerminator.terminate('session_expired');

    expect(first).toBe(second);
    expect(handler).toHaveBeenCalledOnce();
    finishCleanup?.();
    await first;
  });
});

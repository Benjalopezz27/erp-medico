/**
 * In-memory registry for tracking and cancelling in-flight authenticated HTTP requests.
 * Prevents race conditions and unhandled responses when a session expires or user logs out.
 */
class PrivateRequestRegistry {
  private controllers = new Set<AbortController>();

  /**
   * Registers and returns a new AbortSignal for an in-flight request.
   */
  createSignal(externalSignal?: GenericAbortSignal): {
    signal: AbortSignal;
    release: () => void;
  } {
    const controller = new AbortController();
    this.controllers.add(controller);

    const forwardAbort = () => controller.abort();
    if (externalSignal?.aborted) {
      forwardAbort();
    } else {
      externalSignal?.addEventListener?.('abort', forwardAbort, { once: true });
    }

    return {
      signal: controller.signal,
      release: () => {
        externalSignal?.removeEventListener?.('abort', forwardAbort);
        this.controllers.delete(controller);
      },
    };
  }

  /**
   * Aborts all registered in-flight requests and clears the registry.
   */
  abortAll(reason = 'Session terminated'): void {
    for (const controller of this.controllers) {
      try {
        controller.abort(reason);
      } catch {
        // Ignore errors during abortion
      }
    }
    this.controllers.clear();
  }

  /**
   * Returns the count of active in-flight requests.
   */
  get size(): number {
    return this.controllers.size;
  }
}

export const privateRequestRegistry = new PrivateRequestRegistry();
import type { GenericAbortSignal } from 'axios';

import { privateRequestRegistry } from './private-request-registry';

export type SessionTerminationReason =
  'user_logout' | 'session_expired' | 'unauthorized_401' | 'manual_reset';

type TerminationHandler = (reason: SessionTerminationReason) => void | Promise<void>;

class SessionTerminator {
  private handler: TerminationHandler | null = null;
  private termination: Promise<void> | null = null;

  /**
   * Registers a subscriber callback to be invoked when the session terminates.
   * Returns an unsubscribe function.
   */
  register(handler: TerminationHandler): () => void {
    this.handler = handler;
    return () => {
      if (this.handler === handler) this.handler = null;
    };
  }

  /**
   * Triggers session termination across the entire SPA:
   * 1. Aborts in-flight authenticated requests.
   * 2. Notifies registered listeners (auth store, queryClient, router).
   */
  terminate(reason: SessionTerminationReason = 'session_expired'): Promise<void> {
    if (this.termination) return this.termination;

    this.termination = this.runTermination(reason).finally(() => {
      this.termination = null;
    });
    return this.termination;
  }

  private async runTermination(reason: SessionTerminationReason): Promise<void> {
    privateRequestRegistry.abortAll(`Session ended due to ${reason}`);
    await this.handler?.(reason);
  }

  /**
   * Resets all listeners (primarily for test cleanup).
   */
  clearListeners(): void {
    this.handler = null;
    this.termination = null;
  }
}

export const sessionTerminator = new SessionTerminator();

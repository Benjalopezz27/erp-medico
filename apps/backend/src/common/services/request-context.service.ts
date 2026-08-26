import { AsyncLocalStorage } from 'async_hooks';

export interface IRequestContext {
  requestId: string;
  ip?: string;
  method?: string;
  url?: string;
  userId?: string;
  userRole?: string;
  startTime?: number;
}

export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<IRequestContext>();

  /**
   * Runs the provided callback within an isolated request context.
   */
  static run<T>(context: IRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /**
   * Retrieves current request context from AsyncLocalStorage.
   */
  static get(): IRequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Updates authenticated user information in current context.
   */
  static setUser(userId: string, userRole?: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
      store.userRole = userRole;
    }
  }

  /**
   * Returns current request ID or a fallback string.
   */
  static getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}

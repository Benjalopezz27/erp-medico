import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { server } from './mocks/server';
import { resetAllStores } from './zustand-reset';

// 1. Establish MSW Network Mocking with strict unhandled request failure
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  if (typeof window !== 'undefined') {
    window.scrollTo = vi.fn();
    window.ResizeObserver =
      window.ResizeObserver ||
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));
  }
});

// 2. Comprehensive Teardown after each test case
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetAllStores();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

// 3. Close MSW server on suite completion
afterAll(() => {
  server.close();
});

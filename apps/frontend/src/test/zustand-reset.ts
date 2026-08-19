import type { StoreApi } from 'zustand';

const storeResetFns = new Set<() => void>();

/**
 * Registers a Zustand store to be automatically reset to its initial state after each test.
 */
export const registerStoreForReset = <T>(store: StoreApi<T>): StoreApi<T> => {
  const initialState = store.getState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

/**
 * Resets all registered Zustand stores to their initial state.
 */
export const resetAllStores = (): void => {
  storeResetFns.forEach((resetFn) => resetFn());
};

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
  createRootRoute,
  createRoute,
  Outlet,
  AnyRouter,
} from '@tanstack/react-router';

/**
 * Creates an isolated QueryClient for testing with zero retries and zero cache retention.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  userEventOptions?: Parameters<typeof userEvent.setup>[0];
}

export interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  queryClient: QueryClient;
}

/**
 * Renders UI wrapped in an isolated QueryClientProvider.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): CustomRenderResult {
  const { queryClient = createTestQueryClient(), userEventOptions, ...renderOptions } = options;

  const user = userEvent.setup(userEventOptions);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    user,
    queryClient,
  };
}

export interface RenderWithRouterOptions {
  router: AnyRouter;
  queryClient?: QueryClient;
  userEventOptions?: Parameters<typeof userEvent.setup>[0];
}

/**
 * Dedicated helper to render an in-memory TanStack Router tree.
 */
export function renderWithRouter(options: RenderWithRouterOptions): CustomRenderResult {
  const { router, queryClient = createTestQueryClient(), userEventOptions } = options;

  const user = userEvent.setup(userEventOptions);

  const Wrapper: React.FC = () => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  const renderResult = render(<Wrapper />);

  return {
    ...renderResult,
    user,
    queryClient,
  };
}

/**
 * Factory helper to construct an isolated TanStack Memory Router for testing route navigation.
 */
export function createTestRouter(
  routes: Array<{ path: string; component: React.FC }>,
  initialPath = '/',
) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const routeChildren = routes.map((r) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: r.path,
      component: r.component,
    }),
  );

  const routeTree = rootRoute.addChildren(routeChildren);
  const memoryHistory = createMemoryHistory({ initialEntries: [initialPath] });

  return createRouter({
    routeTree,
    history: memoryHistory,
  });
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { userEvent };
export { registerStoreForReset, resetAllStores } from './zustand-reset';

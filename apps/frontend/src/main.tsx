import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './index.css';
import { queryClient } from '@/lib/query-client';
import { configureSessionManager } from '@/services/session-manager';
import { router } from '@/router';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';

configureSessionManager({
  queryClient,
  getCurrentPath: () => router.state.location.pathname,
  navigateToLogin: () => router.navigate({ to: '/login', replace: true }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);

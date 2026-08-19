import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { queryClient } from '@/lib/query-client';
import { configureSessionManager } from '@/services/session-manager';
import { router } from '@/router';

configureSessionManager({
  queryClient,
  getCurrentPath: () => router.state.location.pathname,
  navigateToLogin: () => router.navigate({ to: '/login', replace: true }),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

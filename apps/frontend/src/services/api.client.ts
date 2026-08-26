import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getApiUrl } from '@/config/api.config';
import { useAuthStore } from '@/stores/authStore';
import { privateRequestRegistry } from './private-request-registry';
import { sessionTerminator } from './session-terminator';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _releasePrivateRequest?: () => void;
  }
}

/**
 * Public API client for unauthenticated endpoints (e.g. /auth/login).
 * Does not attach bearer tokens or session termination interceptors.
 */
export const publicApiClient: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

publicApiClient.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  return config;
});

/**
 * Authenticated API client for protected business endpoints.
 * Attaches in-memory JWT bearer token, tracks in-flight abort signals,
 * and terminates session on 401 Unauthorized responses.
 */
export const apiClient: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT and AbortSignal
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiUrl();

  // Attach In-Memory Token
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  // Register in-flight request for abortion on session termination
  const { signal, release } = privateRequestRegistry.createSignal(config.signal);
  config.signal = signal;
  config._releasePrivateRequest = release;

  return config;
});

// Response Interceptor: Cleanup AbortController and handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    // Unregister controller upon successful resolution
    response.config._releasePrivateRequest?.();
    return response;
  },
  (error: AxiosError) => {
    // Unregister controller upon failure
    error.config?._releasePrivateRequest?.();

    // Attach requestId to normalized Axios error
    const requestId =
      (error.response?.data as Record<string, any>)?.requestId ||
      (error.response?.headers as Record<string, any>)?.['x-request-id'];
    if (requestId) {
      (error as any).requestId = requestId;
    }

    // Handle 401 Unauthorized -> Terminate session acyclically
    if (error.response?.status === 401) {
      void sessionTerminator.terminate('unauthorized_401');
    }

    return Promise.reject(error);
  },
);

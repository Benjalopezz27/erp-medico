export const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

export function getApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();

  if (!raw) {
    return DEFAULT_API_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`[FATAL] VITE_API_URL is not a valid URL: ${raw}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `[FATAL] VITE_API_URL must use HTTP or HTTPS protocol. Received: ${parsed.protocol}`,
    );
  }

  if (parsed.username || parsed.password) {
    throw new Error('[FATAL] VITE_API_URL must not contain embedded user credentials.');
  }

  return raw.replace(/\/+$/, '');
}

export const apiConfig = {
  get baseUrl(): string {
    return getApiUrl();
  },
};

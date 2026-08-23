import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_API_URL, getApiUrl, apiConfig } from './api.config';

describe('API Configuration (getApiUrl)', () => {
  it('should return normalized base URL when valid http URL is provided', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000/api/v1/');
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
    expect(apiConfig.baseUrl).toBe('http://localhost:3000/api/v1');
  });

  it('should return normalized base URL when valid https URL is provided without trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.erp-medico.com/v1');
    expect(getApiUrl()).toBe('https://api.erp-medico.com/v1');
  });

  it('should return relative path when valid relative path is provided', () => {
    vi.stubEnv('VITE_API_URL', '/api/v1');
    expect(getApiUrl()).toBe('/api/v1');
    expect(apiConfig.baseUrl).toBe('/api/v1');
  });

  it('should normalize trailing slashes on relative paths', () => {
    vi.stubEnv('VITE_API_URL', '/api/v1///');
    expect(getApiUrl()).toBe('/api/v1');
  });

  it('should handle root relative path', () => {
    vi.stubEnv('VITE_API_URL', '/');
    expect(getApiUrl()).toBe('/');
  });

  it('should trim whitespace around VITE_API_URL', () => {
    vi.stubEnv('VITE_API_URL', '   http://localhost:3000/api/v1   ');
    expect(getApiUrl()).toBe('http://localhost:3000/api/v1');
  });

  it('uses the documented local URL when VITE_API_URL is missing or empty', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(getApiUrl()).toBe(DEFAULT_API_URL);
  });

  it('should throw error when VITE_API_URL is not a valid URL format', () => {
    vi.stubEnv('VITE_API_URL', 'not-a-valid-url');
    expect(() => getApiUrl()).toThrow(/not a valid URL/);
  });

  it('should throw error when VITE_API_URL uses invalid protocol (e.g. ftp:)', () => {
    vi.stubEnv('VITE_API_URL', 'ftp://api.erp-medico.com');
    expect(() => getApiUrl()).toThrow(/must use HTTP or HTTPS protocol/);
  });

  it('should throw error when VITE_API_URL contains embedded credentials', () => {
    vi.stubEnv('VITE_API_URL', 'http://admin:secret@localhost:3000/api/v1');
    expect(() => getApiUrl()).toThrow(/must not contain embedded user credentials/);
  });
});

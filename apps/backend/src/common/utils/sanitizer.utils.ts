export const REDACTED_VALUE = '[REDACTED]';

/**
 * Exact or bounded sensitive key patterns (case-insensitive).
 * Uses bounded regex so functional keys like 'productKey', 'monkey', or 'tokenCount'
 * are NOT inadvertently redacted.
 */
export const SENSITIVE_KEY_REGEX =
  /^(password|currentpassword|current_password|newpassword|new_password|passwordhash|password_hash|seed_admin_password|seed_vendedor_password|authorization|cookie|set-cookie|token|accesstoken|access_token|refreshtoken|refresh_token|jwt|jwt_secret|secret|credentials|authheader|apikey|api_key|privatekey|private_key|db_password|database_password|postgres_password|certificate|cert|p12|pfx|arca_cert_password)$/i;

export const BEARER_TOKEN_REGEX =
  /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi;

export const PEM_PRIVATE_KEY_REGEX =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi;

export interface SanitizeOptions {
  mode?: 'redact' | 'strip';
  maxDepth?: number;
}

/**
 * Recursively redacts or strips sensitive credentials, tokens, and keys from any data structure.
 */
export function redactSecrets<T>(
  data: T,
  options: SanitizeOptions = { mode: 'redact', maxDepth: 10 },
  seen = new WeakSet<object>(),
  depth = 0,
): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (BEARER_TOKEN_REGEX.test(data)) {
      return data.replace(
        BEARER_TOKEN_REGEX,
        `Bearer ${REDACTED_VALUE}`,
      ) as unknown as T;
    }
    if (PEM_PRIVATE_KEY_REGEX.test(data)) {
      return data.replace(
        PEM_PRIVATE_KEY_REGEX,
        REDACTED_VALUE,
      ) as unknown as T;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (data instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: data.name,
      message: redactSecrets(data.message, options, seen, depth + 1),
      stack: data.stack
        ? redactSecrets(data.stack, options, seen, depth + 1)
        : undefined,
    };
    return errorObj as unknown as T;
  }

  const maxDepth = options.maxDepth ?? 10;
  if (depth >= maxDepth) {
    return REDACTED_VALUE as unknown as T;
  }

  if (seen.has(data as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) =>
      redactSecrets(item, options, seen, depth + 1),
    ) as unknown as T;
  }

  const mode = options.mode ?? 'redact';
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      if (mode === 'strip') {
        continue;
      }
      result[key] = REDACTED_VALUE;
    } else {
      result[key] = redactSecrets(value, options, seen, depth + 1);
    }
  }

  return result as T;
}

/**
 * Strips sensitive keys entirely (used by AuditService snapshots).
 */
export function stripSensitiveKeys<T>(data: T): T {
  return redactSecrets(data, { mode: 'strip', maxDepth: 10 });
}

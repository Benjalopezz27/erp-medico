const SENSITIVE_KEY_PATTERN =
  /password|hash|password_hash|passwordHash|token|accessToken|refreshToken|secret|credentials|authorization/i;

/**
 * Deeply sanitizes an object or array to ensure no sensitive credentials or keys
 * are ever stored in audit log snapshots or serialized into responses.
 */
export function sanitizeAuditSnapshot<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditSnapshot(item)) as unknown as T;
  }


  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }
    result[key] = sanitizeAuditSnapshot(value);
  }

  return result as T;
}

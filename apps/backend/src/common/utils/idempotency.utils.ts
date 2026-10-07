import { createHash } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonicalize(v)]),
    );
  }
  return value;
}

/** SHA-256 of the request body with keys sorted, so field order is irrelevant. */
export function hashRequest(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(body)))
    .digest('hex');
}

/**
 * Serializes concurrent requests that carry the same (scope, user, key): the
 * second one waits for the first to commit, then sees its row on lookup.
 * Released at transaction end.
 */
export async function lockIdempotencyKey(
  manager: EntityManager,
  scope: string,
  userId: string,
  key: string,
): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [
    `idem:${scope}:${userId}:${key}`,
  ]);
}

/** Replay is only valid for the exact same body; otherwise the key is reused. */
export function assertSameRequest(
  stored: { requestHash: string | null },
  requestHash: string,
  code: string,
): void {
  if (stored.requestHash !== requestHash) {
    throw new ConflictException({
      code,
      message:
        'La clave de idempotencia ya fue utilizada con un contenido diferente.',
    });
  }
}

import { stripSensitiveKeys } from '../../../common/utils/sanitizer.utils';

/**
 * Deeply sanitizes an object or array to ensure no sensitive credentials or keys
 * are ever stored in audit log snapshots or serialized into responses.
 * Delegates to the central stripSensitiveKeys utility.
 */
export function sanitizeAuditSnapshot<T>(data: T): T {
  return stripSensitiveKeys(data);
}

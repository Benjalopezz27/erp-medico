import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { normalizeEmail } from '../../../common/utils/string.utils';

/**
 * Route-level companion to the global (per-IP) ThrottlerGuard: counts
 * requests per target email so one address cannot be mail-bombed from many IPs.
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const raw = req.body?.email;
    const email = typeof raw === 'string' ? normalizeEmail(raw) : '';
    return Promise.resolve(email ? `email:${email}` : `ip:${req.ip}`);
  }
}

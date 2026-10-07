import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  PASSWORD_RESET_SUBJECT,
  renderPasswordResetEmail,
} from './password-reset.template';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Single transactional-mail implementation (Resend over HTTPS; Railway blocks
 * outbound SMTP on lower plans). Without MAIL_API_KEY it only logs (dev/test);
 * in production a missing key fails the job instead of logging the link.
 * Swapping provider only touches this file.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, link: string): Promise<void> {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const apiKey = isProd
      ? this.config.getOrThrow<string>('MAIL_API_KEY')
      : this.config.get<string>('MAIL_API_KEY');

    if (!apiKey) {
      this.logger.log(`[Mail:dry-run] password reset for ${to}: ${link}`);
      return;
    }

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [to],
        subject: PASSWORD_RESET_SUBJECT,
        ...renderPasswordResetEmail(link),
      }),
    });

    if (!res.ok) {
      // Body omitted on purpose: never echo provider payloads (may include the link).
      throw new Error(`Mail provider responded ${res.status}`);
    }
  }
}

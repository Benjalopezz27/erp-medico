import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Single transactional-mail implementation (Resend over HTTPS; Railway blocks
 * outbound SMTP on lower plans). Outside production it only logs, so dev/test never send. Swapping provider only touches this file.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, link: string): Promise<void> {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.log(`[Mail:dry-run] password reset for ${to}: ${link}`);
      return;
    }
    // In production a missing key fails the job (retried) instead of logging the link.
    const apiKey = this.config.getOrThrow<string>('MAIL_API_KEY');

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>('MAIL_FROM'),
        to: [to],
        subject: 'Recuperá tu contraseña',
        html: `<p>Pediste restablecer tu contraseña.</p><p><a href="${link}">Elegir una contraseña nueva</a></p><p>El link vence en 30 minutos y se puede usar una sola vez. Si no fuiste vos, ignorá este mail.</p>`,
      }),
    });

    if (!res.ok) {
      // Body omitted on purpose: never echo provider payloads (may include the link).
      throw new Error(`Mail provider responded ${res.status}`);
    }
  }
}

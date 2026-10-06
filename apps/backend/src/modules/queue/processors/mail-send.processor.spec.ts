import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { MailSendProcessor } from './mail-send.processor';
import { MailService } from '../../mail/mail.service';

describe('MailSendProcessor', () => {
  it('builds the reset link from APP_PUBLIC_URL and sends it', async () => {
    const mail = { sendPasswordReset: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://erp.test/'),
    };
    const processor = new MailSendProcessor(
      {} as any,
      mail as unknown as MailService,
      config as unknown as ConfigService,
    );

    await processor.process({
      data: { type: 'password-reset', to: 'a@erp.com', token: 'a/b' },
    } as Job<any>);

    expect(mail.sendPasswordReset).toHaveBeenCalledWith(
      'a@erp.com',
      'https://erp.test/reset-password?token=a%2Fb',
    );
  });

  it('propagates provider errors so BullMQ retries', async () => {
    const mail = {
      sendPasswordReset: jest.fn().mockRejectedValue(new Error('x')),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://erp.test'),
    };
    const processor = new MailSendProcessor(
      {} as any,
      mail as unknown as MailService,
      config as unknown as ConfigService,
    );
    await expect(
      processor.process({
        data: { type: 'password-reset', to: 'a', token: 't' },
      } as Job<any>),
    ).rejects.toThrow('x');
  });
});

import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const build = (env: Record<string, string>) =>
  new MailService({
    get: (k: string) => env[k],
    getOrThrow: (k: string) => env[k],
  } as unknown as ConfigService);

describe('MailService', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('does not call the provider outside production', async () => {
    await build({
      NODE_ENV: 'development',
      MAIL_API_KEY: 'k',
    }).sendPasswordReset('a@b.com', 'http://x');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails in production without API key instead of logging the link', async () => {
    const svc = build({ NODE_ENV: 'production' });
    const getOrThrow = jest.fn(() => {
      throw new Error('missing');
    });
    (svc as any).config.getOrThrow = getOrThrow;
    await expect(
      svc.sendPasswordReset('a@b.com', 'http://x'),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to Resend in production', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await build({
      NODE_ENV: 'production',
      MAIL_API_KEY: 'key',
      MAIL_FROM: 'ERP <no-reply@x.com>',
    }).sendPasswordReset('a@b.com', 'http://x/reset?token=t');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer key');
    expect(JSON.parse(init.body)).toMatchObject({
      to: ['a@b.com'],
      from: 'ERP <no-reply@x.com>',
    });
  });

  it('throws on provider error without leaking the body', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });
    await expect(
      build({
        NODE_ENV: 'production',
        MAIL_API_KEY: 'key',
        MAIL_FROM: 'f',
      }).sendPasswordReset('a@b.com', 'http://x'),
    ).rejects.toThrow('Mail provider responded 422');
  });
});

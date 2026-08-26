import { StructuredJsonLogger } from './structured-json-logger.service';
import { RequestContextService } from '../services/request-context.service';
import { REDACTED_VALUE } from '../utils/sanitizer.utils';

describe('StructuredJsonLogger', () => {
  let logger: StructuredJsonLogger;
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new StructuredJsonLogger();
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('outputs JSON log with correlation ID, version, and level', async () => {
    await RequestContextService.run(
      { requestId: 'test-req-999', userId: 'usr-1' },
      () => {
        logger.log('Hello world', 'TestContext');
      },
    );

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const logStr = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(logStr);

    expect(parsed.level).toBe('info');
    expect(parsed.context).toBe('TestContext');
    expect(parsed.message).toBe('Hello world');
    expect(parsed.requestId).toBe('test-req-999');
    expect(parsed.userId).toBe('usr-1');
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.environment).toBeDefined();
  });

  it('sanitizes secrets in objects passed to logger', () => {
    logger.warn({ password: 'secret', safeKey: 'value' }, 'Auth');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const logStr = stdoutSpy.mock.calls[0][0];
    const parsed = JSON.parse(logStr);

    expect(parsed.level).toBe('warn');
    expect(parsed.message.password).toBe(REDACTED_VALUE);
    expect(parsed.message.safeKey).toBe('value');
  });

  it('writes error logs to stderr including stack trace', () => {
    logger.error(
      'Database connection failed',
      'Error: timeout\n at query.ts:10',
      'TypeORM',
    );

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const logStr = stderrSpy.mock.calls[0][0];
    const parsed = JSON.parse(logStr);

    expect(parsed.level).toBe('error');
    expect(parsed.message).toBe('Database connection failed');
    expect(parsed.stack).toBeDefined();
  });
});

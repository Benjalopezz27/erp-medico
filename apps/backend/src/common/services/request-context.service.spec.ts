import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  it('stores and retrieves context within async execution chain', async () => {
    expect(RequestContextService.get()).toBeUndefined();

    await RequestContextService.run(
      { requestId: 'test-req-123', ip: '127.0.0.1' },
      async () => {
        expect(RequestContextService.getRequestId()).toBe('test-req-123');
        expect(RequestContextService.get()?.ip).toBe('127.0.0.1');

        RequestContextService.setUser('user-456', 'ADMINISTRADOR');
        expect(RequestContextService.get()?.userId).toBe('user-456');
        expect(RequestContextService.get()?.userRole).toBe('ADMINISTRADOR');
      },
    );

    expect(RequestContextService.get()).toBeUndefined();
  });

  it('isolates context between concurrent async executions', async () => {
    const taskA = RequestContextService.run(
      { requestId: 'req-A' },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return RequestContextService.getRequestId();
      },
    );

    const taskB = RequestContextService.run(
      { requestId: 'req-B' },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return RequestContextService.getRequestId();
      },
    );

    const [resA, resB] = await Promise.all([taskA, taskB]);
    expect(resA).toBe('req-A');
    expect(resB).toBe('req-B');
  });
});

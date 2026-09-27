import { PendingFiscalController } from './pending-fiscal.controller';

describe('PendingFiscalController', () => {
  let controller: PendingFiscalController;
  let service: any;

  beforeEach(() => {
    service = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      count: jest.fn().mockResolvedValue({ pendingCount: 0, rejectedCount: 0 }),
      metrics: jest.fn().mockResolvedValue({}),
      retry: jest.fn().mockResolvedValue({ jobId: 'job-1', created: true }),
    };
    controller = new PendingFiscalController(service);
  });

  it('delegates findAll to the service', async () => {
    const query = { page: 1, limit: 20 } as any;
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates count to the service', async () => {
    await controller.count();
    expect(service.count).toHaveBeenCalled();
  });

  it('delegates metrics to the service', async () => {
    await controller.metrics();
    expect(service.metrics).toHaveBeenCalled();
  });

  it('delegates retry to the service with the actor id', async () => {
    await controller.retry('doc-1', { id: 'user-1' } as any);
    expect(service.retry).toHaveBeenCalledWith('doc-1', 'user-1');
  });
});

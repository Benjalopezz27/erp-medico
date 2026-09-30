import { FiscalReconciliationSweepService } from './fiscal-reconciliation-sweep.service';

describe('FiscalReconciliationSweepService', () => {
  let service: FiscalReconciliationSweepService;
  let repo: { find: jest.Mock };
  let dataSource: any;
  let queueService: any;
  let configService: any;

  beforeEach(() => {
    repo = { find: jest.fn().mockResolvedValue([]) };
    dataSource = { getRepository: jest.fn().mockReturnValue(repo) };
    queueService = { requeue: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(undefined) };

    service = new FiscalReconciliationSweepService(
      dataSource,
      queueService,
      configService,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('re-encolas un documento pendiente sin job activo', async () => {
    repo.find.mockResolvedValue([{ id: 'doc-1' }]);
    queueService.requeue.mockResolvedValue({
      jobId: 'wsfe-emit-doc-1',
      created: true,
    });

    const requeued = await service.sweep();

    expect(queueService.requeue).toHaveBeenCalledWith('doc-1');
    expect(requeued).toBe(1);
  });

  it('no cuenta un documento cuyo job ya estaba en curso (requeue no lo recreó)', async () => {
    repo.find.mockResolvedValue([{ id: 'doc-1' }]);
    queueService.requeue.mockResolvedValue({
      jobId: 'wsfe-emit-doc-1',
      created: false,
    });

    const requeued = await service.sweep();

    expect(requeued).toBe(0);
  });

  it('no lanza si la tabla está vacía', async () => {
    await expect(service.sweep()).resolves.toBe(0);
  });

  it('continúa con el resto del lote si un requeue individual falla', async () => {
    repo.find.mockResolvedValue([{ id: 'doc-1' }, { id: 'doc-2' }]);
    queueService.requeue
      .mockRejectedValueOnce(new Error('Redis down'))
      .mockResolvedValueOnce({ jobId: 'wsfe-emit-doc-2', created: true });

    const requeued = await service.sweep();

    expect(queueService.requeue).toHaveBeenCalledTimes(2);
    expect(requeued).toBe(1);
  });

  it('arranca un sweep inicial y un interval en onModuleInit sin lanzar', () => {
    expect(() => service.onModuleInit()).not.toThrow();
  });
});

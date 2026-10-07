import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

function build(opts: {
  done: string[];
  skipped?: string[];
  completed?: boolean;
}) {
  const rows = [
    ...(opts.completed ? [{ key: 'onboarding_completed', value: 'true' }] : []),
    ...(opts.skipped ?? []).map((id) => ({
      key: `onboarding_skip_${id}`,
      value: 'true',
    })),
  ];
  const settings = {
    findOne: jest.fn(async () =>
      rows.find((r) => r.key === 'onboarding_completed'),
    ),
    find: jest.fn(async () => rows),
    save: jest.fn(async (r) => r),
  };
  // Cada query de datos identifica su paso por la tabla consultada.
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      const map: Record<string, string> = {
        users: 'users',
        'catalog-base': 'categories',
        products: 'FROM products',
        parties: 'customers',
        treasury: 'treasury_movements',
        stock: 'stock_movements',
      };
      const id = Object.keys(map).find((k) => sql.includes(map[k]))!;
      return [{ ok: opts.done.includes(id) }];
    }),
  };
  const systemSettings = {
    getEffective: jest.fn(async () => ({
      issuerRazonSocial: opts.done.includes('fiscal') ? 'ACME' : null,
      issuerCuit: '20111111112',
      issuerTaxCondition: 'RESPONSABLE_INSCRIPTO',
      arcaPuntoVenta: 1,
    })),
  };
  const service = new OnboardingService(
    dataSource as never,
    settings as never,
    systemSettings as never,
  );
  return { service, settings };
}

describe('OnboardingService', () => {
  it('sistema nuevo: primer paso pendiente es fiscal', async () => {
    const { service } = build({ done: [] });
    const s = await service.getStatus();
    expect(s.completed).toBe(false);
    expect(s.pendingStep).toBe('fiscal');
  });

  it('refleja pasos hechos y reentra al primer pendiente', async () => {
    const { service } = build({ done: ['fiscal', 'users'] });
    const s = await service.getStatus();
    expect(s.steps.slice(0, 2).map((x) => x.state)).toEqual(['done', 'done']);
    expect(s.pendingStep).toBe('catalog-base');
  });

  it('omitir productos omite stock', async () => {
    const { service } = build({
      done: ['fiscal', 'users', 'catalog-base'],
      skipped: ['products'],
    });
    const s = await service.getStatus();
    expect(s.steps.find((x) => x.id === 'stock')?.state).toBe('skipped');
  });

  it('no deja omitir un paso obligatorio', async () => {
    const { service } = build({ done: [] });
    await expect(service.skip('fiscal', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('complete falla con pendientes y no escribe el flag', async () => {
    const { service, settings } = build({ done: ['fiscal'] });
    await expect(service.complete('u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(settings.save).not.toHaveBeenCalled();
  });

  it('complete escribe el flag con todo resuelto', async () => {
    const { service, settings } = build({
      done: ['fiscal', 'users', 'catalog-base'],
      skipped: ['products', 'parties', 'treasury', 'stock'],
    });
    await service.complete('u1');
    expect(settings.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'onboarding_completed', value: 'true' }),
    );
    await expect(service.isCompleted()).resolves.toBe(true);
  });
});

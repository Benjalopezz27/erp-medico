import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

function build(opts: { done: string[]; keys?: string[] }) {
  const rows = (opts.keys ?? []).map((key) => ({ key, value: 'true' }));
  const settings = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (r) => r),
  };
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      const map: Record<string, string> = {
        users: 'FROM users',
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
  it('calcula cada paso desde los datos, sin persistir nada', async () => {
    const { service, settings } = build({ done: ['fiscal', 'users'] });
    const s = await service.getStatus();
    expect(s.steps.map((x) => x.done)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(settings.save).not.toHaveBeenCalled();
  });

  it('informa bloque y carteles descartados', async () => {
    const { service } = build({
      done: [],
      keys: ['onboarding_dismissed', 'hint_dismissed_sales'],
    });
    const s = await service.getStatus();
    expect(s.dismissed).toBe(true);
    expect(s.hintsDismissed).toEqual(['sales']);
  });

  it('descartar el bloque persiste la clave', async () => {
    const { service, settings } = build({ done: [] });
    await service.dismiss('u1');
    expect(settings.save).toHaveBeenCalledWith({
      key: 'onboarding_dismissed',
      value: 'true',
      updatedByUserId: 'u1',
    });
  });

  it('descartar un cartel persiste su clave', async () => {
    const { service, settings } = build({ done: [] });
    await service.dismissHint('products', 'u1');
    expect(settings.save).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'hint_dismissed_products' }),
    );
  });

  it('rechaza un cartel desconocido', async () => {
    const { service, settings } = build({ done: [] });
    await expect(service.dismissHint('nope', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(settings.save).not.toHaveBeenCalled();
  });
});

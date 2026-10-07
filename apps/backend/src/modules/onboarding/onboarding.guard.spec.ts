import { HttpException } from '@nestjs/common';
import { OnboardingGuard } from './onboarding.guard';

const ctx = { getHandler: () => ({}) } as never;
const make = (completed: boolean, allowed = false) =>
  new OnboardingGuard(
    {
      isCompleted: async () => completed,
      getStatus: async () => ({ pendingStep: 'users' }),
    } as never,
    { get: () => allowed } as never,
  );

describe('OnboardingGuard', () => {
  it('deja pasar con onboarding completo', async () => {
    await expect(make(true).canActivate(ctx)).resolves.toBe(true);
  });
  it('428 con el paso pendiente si está incompleto', async () => {
    const err = await make(false)
      .canActivate(ctx)
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(428);
    expect(err.getResponse()).toMatchObject({ pendingStep: 'users' });
  });
  it('deja pasar rutas marcadas para el wizard', async () => {
    await expect(make(false, true).canActivate(ctx)).resolves.toBe(true);
  });
});

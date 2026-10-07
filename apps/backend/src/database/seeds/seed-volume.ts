import dataSource from '../data-source';
import { runInitialSeed } from './initial.seed';
import { runVolumeSeed } from './volume.seed';
import { User } from '../../modules/users/entities/user.entity';

async function bootstrap() {
  await dataSource.initialize();
  try {
    await runInitialSeed(dataSource);
    const user = await dataSource
      .getRepository(User)
      .findOneOrFail({ where: {}, order: { createdAt: 'ASC' } });
    const result = await runVolumeSeed(dataSource, {
      userId: user.id,
      products: Number(process.env.VOLUME_PRODUCTS) || undefined,
      customers: Number(process.env.VOLUME_CUSTOMERS) || undefined,
      sales: Number(process.env.VOLUME_SALES) || undefined,
    });
    console.log('[SEED:VOLUME]', JSON.stringify(result));
  } catch (error) {
    console.error('[SEED:VOLUME] error:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

bootstrap();

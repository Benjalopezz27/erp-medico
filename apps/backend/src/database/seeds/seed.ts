import dataSource from '../data-source';
import { runInitialSeed } from './initial.seed';
import { runCatalogSeed } from './catalog.seed';

async function bootstrap() {
  console.log('[SEED] Initializing database connection...');
  await dataSource.initialize();

  try {
    console.log('[SEED] Running initial user seed...');
    const userResult = await runInitialSeed(dataSource);
    console.log(
      `[SEED] User seed completed: ${userResult.created} created, ${userResult.skipped} skipped.`,
    );
    console.log('[SEED] Running demonstration catalog seed...');
    const catalogResult = await runCatalogSeed(dataSource);
    const catalogCreated = Object.values(catalogResult).reduce(
      (total, count) => total + count.created,
      0,
    );
    const catalogSkipped = Object.values(catalogResult).reduce(
      (total, count) => total + count.skipped,
      0,
    );
    console.log(
      `[SEED] Catalog seed completed: ${catalogCreated} created, ${catalogSkipped} skipped.`,
    );
  } catch (error) {
    console.error('[SEED] Seed execution error:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

bootstrap();

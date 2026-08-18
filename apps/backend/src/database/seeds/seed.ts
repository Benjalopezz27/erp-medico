import dataSource from '../data-source';
import { runInitialSeed } from './initial.seed';

async function bootstrap() {
  console.log('[SEED] Initializing database connection...');
  await dataSource.initialize();

  try {
    console.log('[SEED] Running initial user seed...');
    const result = await runInitialSeed(dataSource);
    console.log(
      `[SEED] Seed completed successfully: ${result.created} created, ${result.skipped} skipped.`,
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

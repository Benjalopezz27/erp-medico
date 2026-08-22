import dataSource from './data-source';

async function run(): Promise<void> {
  console.log('[MIGRATION] Initializing DataSource...');
  await dataSource.initialize();

  console.log('[MIGRATION] Running pending migrations...');
  const migrations = await dataSource.runMigrations();

  if (migrations.length === 0) {
    console.log('[MIGRATION] No pending migrations to execute.');
  } else {
    console.log(
      `[MIGRATION] Successfully executed ${migrations.length} migration(s):`,
    );
    migrations.forEach((m) => console.log(` - ${m.name}`));
  }

  await dataSource.destroy();
  console.log('[MIGRATION] Completed successfully.');
  process.exit(0);
}

run().catch(async (error) => {
  console.error('[MIGRATION FATAL ERROR]', error);
  try {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  } catch {
    // Ignore secondary cleanup error
  }
  process.exit(1);
});

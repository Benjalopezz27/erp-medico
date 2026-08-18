import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@erp/shared-types';
import { User } from '../../modules/users/entities/user.entity';
import { normalizeEmail } from '../../common/utils/string.utils';

export interface SeedOptions {
  adminEmail?: string;
  adminPassword?: string;
  adminName?: string;
  vendedorEmail?: string;
  vendedorPassword?: string;
  vendedorName?: string;
  bcryptRounds?: number;
  logger?: {
    log: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}

export interface SeedResult {
  created: number;
  skipped: number;
}

/**
 * Runs the initial user seed in an idempotent transaction.
 *
 * @param dataSource - Initialized TypeORM DataSource
 * @param options - Optional configuration overrides (useful for testing)
 * @returns SeedResult with counts of created and skipped users
 */
export async function runInitialSeed(
  dataSource: DataSource,
  options?: SeedOptions,
): Promise<SeedResult> {
  const logger = options?.logger ?? {
    log: (msg: string) => console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string) => console.error(msg),
  };

  const adminPassword =
    options?.adminPassword ?? process.env.SEED_ADMIN_PASSWORD;
  const vendedorPassword =
    options?.vendedorPassword ?? process.env.SEED_VENDEDOR_PASSWORD;

  if (!adminPassword || adminPassword.trim() === '') {
    throw new Error(
      'Mandatory configuration "SEED_ADMIN_PASSWORD" is missing or empty. Please configure it in your environment.',
    );
  }

  if (!vendedorPassword || vendedorPassword.trim() === '') {
    throw new Error(
      'Mandatory configuration "SEED_VENDEDOR_PASSWORD" is missing or empty. Please configure it in your environment.',
    );
  }

  const rounds = options?.bcryptRounds ?? 12;

  const targetUsers = [
    {
      name: options?.adminName ?? 'Administrador General',
      email: normalizeEmail(options?.adminEmail ?? 'admin@erp.com'),
      password: adminPassword,
      role: UserRole.ADMINISTRADOR,
    },
    {
      name: options?.vendedorName ?? 'Vendedor Mostrador',
      email: normalizeEmail(options?.vendedorEmail ?? 'vendedor@erp.com'),
      password: vendedorPassword,
      role: UserRole.VENDEDOR,
    },
  ];

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let created = 0;
  let skipped = 0;

  try {
    const userRepo = queryRunner.manager.getRepository(User);

    for (const userData of targetUsers) {
      const existing = await userRepo.findOne({
        where: { email: userData.email },
      });

      if (existing) {
        logger.log(
          `[SEED] User "${userData.email}" already exists (Role: ${existing.role}). Skipping.`,
        );
        skipped++;
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, rounds);
      const user = userRepo.create({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        isActive: true,
      });

      await userRepo.save(user);
      logger.log(
        `[SEED] Created initial user "${userData.email}" with role "${userData.role}".`,
      );
      created++;
    }

    await queryRunner.commitTransaction();
    return { created, skipped };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error(`[SEED] Seed transaction failed and was rolled back.`);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

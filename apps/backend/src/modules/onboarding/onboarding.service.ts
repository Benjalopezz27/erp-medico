import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  IOnboardingStatus,
  IOnboardingStep,
  OnboardingStepId,
} from '@erp/shared-types';
import { SystemSetting } from '../config/entities/system-setting.entity';
import { SystemSettingsService } from '../config/system-settings.service';
import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_STEPS,
  skipKey,
} from './onboarding.constants';

const EXISTS = (sql: string) => `SELECT EXISTS (${sql}) AS ok`;

/** Mínimo cargado por paso, derivado de los datos reales del módulo. */
const DATA_CHECKS: Partial<Record<OnboardingStepId, string>> = {
  users: EXISTS(
    `SELECT 1 FROM users WHERE role = 'ADMINISTRADOR' AND is_active = true`,
  ),
  'catalog-base': `SELECT (EXISTS (SELECT 1 FROM categories) AND EXISTS (SELECT 1 FROM units)) AS ok`,
  products: EXISTS(`SELECT 1 FROM products`),
  parties: `SELECT (EXISTS (SELECT 1 FROM customers) OR EXISTS (SELECT 1 FROM suppliers)) AS ok`,
  treasury: EXISTS(`SELECT 1 FROM treasury_movements`),
  stock: EXISTS(`SELECT 1 FROM stock_movements`),
};

@Injectable()
export class OnboardingService {
  /** Una vez completo no vuelve a `false`: se cachea para el guard. */
  private completedCache = false;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async isCompleted(): Promise<boolean> {
    if (this.completedCache) return true;
    const row = await this.settings.findOne({
      where: { key: ONBOARDING_COMPLETED_KEY },
    });
    this.completedCache = row?.value === 'true';
    return this.completedCache;
  }

  async getStatus(): Promise<IOnboardingStatus> {
    const completed = await this.isCompleted();
    const skipped = new Set(
      (await this.settings.find())
        .filter((s) => s.key.startsWith('onboarding_skip_'))
        .map((s) => s.key),
    );
    const steps: IOnboardingStep[] = [];
    for (const { id, required } of ONBOARDING_STEPS) {
      const state = (await this.isDone(id))
        ? 'done'
        : skipped.has(skipKey(id)) ||
            (id === 'stock' &&
              steps.some((s) => s.id === 'products' && s.state === 'skipped'))
          ? 'skipped'
          : 'pending';
      steps.push({ id, required, state });
    }
    return {
      completed,
      steps,
      pendingStep: steps.find((s) => s.state === 'pending')?.id ?? null,
    };
  }

  async skip(id: OnboardingStepId, userId: string): Promise<IOnboardingStatus> {
    const step = ONBOARDING_STEPS.find((s) => s.id === id);
    if (!step || step.required) {
      throw new BadRequestException(`El paso "${id}" no se puede omitir`);
    }
    await this.settings.save({
      key: skipKey(id),
      value: 'true',
      updatedByUserId: userId,
    });
    return this.getStatus();
  }

  async complete(userId: string): Promise<IOnboardingStatus> {
    const status = await this.getStatus();
    const missing = status.steps.filter((s) => s.state === 'pending');
    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan pasos: ${missing.map((s) => s.id).join(', ')}`,
      );
    }
    await this.settings.save({
      key: ONBOARDING_COMPLETED_KEY,
      value: 'true',
      updatedByUserId: userId,
    });
    this.completedCache = true;
    return this.getStatus();
  }

  private async isDone(id: OnboardingStepId): Promise<boolean> {
    if (id === 'fiscal') {
      const c = await this.systemSettings.getEffective();
      return Boolean(
        c.issuerRazonSocial &&
        c.issuerCuit &&
        c.issuerTaxCondition &&
        c.arcaPuntoVenta,
      );
    }
    const [{ ok }] = await this.dataSource.query(DATA_CHECKS[id]!);
    return ok === true;
  }
}

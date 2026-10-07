import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ContextHintId,
  IOnboardingStatus,
  OnboardingStepId,
} from '@erp/shared-types';
import { SystemSetting } from '../config/entities/system-setting.entity';
import { SystemSettingsService } from '../config/system-settings.service';
import {
  DISMISSED_KEY,
  HINT_IDS,
  HINT_KEY_PREFIX,
  STEP_IDS,
} from './onboarding.constants';

const EXISTS = (sql: string) => `SELECT EXISTS (${sql}) AS ok`;

/** Mínimo cargado por paso, derivado de los datos reales del módulo. */
const DATA_CHECKS: Record<Exclude<OnboardingStepId, 'fiscal'>, string> = {
  users: EXISTS(
    `SELECT 1 FROM users WHERE role = 'ADMINISTRADOR' AND is_active = true`,
  ),
  'catalog-base': `SELECT (EXISTS (SELECT 1 FROM categories) AND EXISTS (SELECT 1 FROM units)) AS ok`,
  products: EXISTS(`SELECT 1 FROM products`),
  parties: `SELECT (EXISTS (SELECT 1 FROM customers) OR EXISTS (SELECT 1 FROM suppliers)) AS ok`,
  treasury: EXISTS(`SELECT 1 FROM treasury_movements`),
  stock: EXISTS(`SELECT 1 FROM stock_movements`),
};

/** El progreso se calcula; solo los descartes se persisten. */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  async getStatus(): Promise<IOnboardingStatus> {
    const keys = new Set((await this.settings.find()).map((s) => s.key));
    const steps = await Promise.all(
      STEP_IDS.map(async (id) => ({ id, done: await this.isDone(id) })),
    );
    return {
      steps,
      dismissed: keys.has(DISMISSED_KEY),
      hintsDismissed: HINT_IDS.filter((h) => keys.has(HINT_KEY_PREFIX + h)),
    };
  }

  async dismiss(userId: string): Promise<IOnboardingStatus> {
    await this.persist(DISMISSED_KEY, userId);
    return this.getStatus();
  }

  async dismissHint(id: string, userId: string): Promise<IOnboardingStatus> {
    if (!HINT_IDS.includes(id as ContextHintId)) {
      throw new BadRequestException(`Cartel desconocido: "${id}"`);
    }
    await this.persist(HINT_KEY_PREFIX + id, userId);
    return this.getStatus();
  }

  private async persist(key: string, userId: string): Promise<void> {
    await this.settings.save({ key, value: 'true', updatedByUserId: userId });
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
    const [{ ok }] = await this.dataSource.query(DATA_CHECKS[id]);
    return ok === true;
  }
}

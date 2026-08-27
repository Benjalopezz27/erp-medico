import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  IPurchaseSettings,
  PurchaseSettingsErrorCode,
} from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { PurchaseSettings } from './entities/purchase-settings.entity';
import { UpdatePurchaseSettingsDto } from './dto/update-purchase-settings.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @InjectRepository(PurchaseSettings)
    private readonly repository: Repository<PurchaseSettings>,
  ) {}

  getStatus(): { module: string; status: string } {
    return { module: 'system-config', status: 'initialized' };
  }

  async getPurchaseSettings(): Promise<IPurchaseSettings> {
    return this.map(await this.load(this.repository.manager, false));
  }

  async getPurchaseToleranceSnapshot(manager: EntityManager): Promise<string> {
    const settings = await this.load(manager, true);
    return new Decimal(settings.costTolerancePercentage).toFixed(4);
  }

  async updatePurchaseSettings(
    dto: UpdatePurchaseSettingsDto,
    userId: string,
  ): Promise<IPurchaseSettings> {
    const tolerance = this.normalizeTolerance(dto.costTolerancePercentage);
    return this.dataSource.transaction(async (manager) => {
      const settings = await this.load(manager, true, 'pessimistic_write');
      const previous = new Decimal(settings.costTolerancePercentage).toFixed(4);
      if (previous === tolerance) return this.map(settings);
      settings.costTolerancePercentage = tolerance;
      settings.updatedByUserId = userId;
      const saved = await manager.save(PurchaseSettings, settings);
      await this.auditService.record(manager, {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityName: 'PurchaseSettings',
        entityId: String(settings.id),
        previousValues: { costTolerancePercentage: previous },
        newValues: { costTolerancePercentage: tolerance },
      });
      saved.updatedBy = await manager.findOne(User, { where: { id: userId } });
      return this.map(saved);
    });
  }

  private normalizeTolerance(value: string): string {
    let parsed: Decimal;
    try {
      parsed = new Decimal(value);
    } catch {
      parsed = new Decimal(-1);
    }
    if (
      !parsed.isFinite() ||
      parsed.lt(0) ||
      parsed.gt(100) ||
      parsed.decimalPlaces() > 4
    ) {
      throw new BadRequestException({
        code: PurchaseSettingsErrorCode.PURCHASE_SETTINGS_INVALID_TOLERANCE,
        message:
          'La tolerancia debe estar entre 0 y 100 con hasta 4 decimales.',
      });
    }
    return parsed.toFixed(4);
  }

  private async load(
    manager: EntityManager,
    lock: boolean,
    lockMode: 'pessimistic_read' | 'pessimistic_write' = 'pessimistic_read',
  ): Promise<PurchaseSettings> {
    const qb = manager
      .createQueryBuilder(PurchaseSettings, 'settings')
      .where('settings.id = 1');
    if (lock) qb.setLock(lockMode);
    const settings = await qb.getOneOrFail();
    settings.updatedBy = settings.updatedByUserId
      ? await manager.findOne(User, { where: { id: settings.updatedByUserId } })
      : null;
    return settings;
  }

  private map(settings: PurchaseSettings): IPurchaseSettings {
    return {
      costTolerancePercentage: new Decimal(
        settings.costTolerancePercentage,
      ).toFixed(4),
      updatedAt: settings.updatedAt.toISOString(),
      updatedBy: settings.updatedBy
        ? {
            id: settings.updatedBy.id,
            name: settings.updatedBy.name,
            email: settings.updatedBy.email,
          }
        : null,
    };
  }
}

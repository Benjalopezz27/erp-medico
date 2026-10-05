import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAction,
  ISystemConfig,
  IUpdateSystemConfigPayload,
  OperatingCurrency,
  TaxCondition,
} from '@erp/shared-types';
import { AuditService } from '../audit/audit.service';
import { SystemSetting } from './entities/system-setting.entity';

export interface IssuerConfig {
  razonSocial: string | null;
  cuit: string | null;
  taxCondition: TaxCondition | null;
}

/** Campo de `ISystemConfig` -> clave en `system_settings` y variable de entorno de respaldo. */
const FIELDS = {
  issuerRazonSocial: {
    key: 'issuer_razon_social',
    env: 'ARCA_EMISOR_RAZON_SOCIAL',
  },
  issuerCuit: { key: 'issuer_cuit', env: 'ARCA_CUIT' },
  issuerTaxCondition: {
    key: 'issuer_tax_condition',
    env: 'ARCA_EMISOR_TAX_CONDITION',
  },
  arcaPuntoVenta: { key: 'arca_punto_venta', env: 'ARCA_PUNTO_VENTA' },
  operatingCurrency: { key: 'operating_currency', env: undefined },
} as const;

const DEFAULT_CURRENCY: OperatingCurrency = 'ARS';

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SystemSetting)
    private readonly repository: Repository<SystemSetting>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async getEffective(): Promise<ISystemConfig> {
    return this.resolve(await this.repository.find());
  }

  async getIssuer(): Promise<IssuerConfig> {
    const cfg = await this.getEffective();
    return {
      razonSocial: cfg.issuerRazonSocial,
      cuit: cfg.issuerCuit,
      taxCondition: cfg.issuerTaxCondition,
    };
  }

  async update(
    payload: IUpdateSystemConfigPayload,
    userId: string,
  ): Promise<ISystemConfig> {
    await this.dataSource.transaction(async (manager) => {
      const current = this.resolve(await manager.find(SystemSetting));
      for (const [field, { key }] of Object.entries(FIELDS)) {
        const next = payload[field as keyof IUpdateSystemConfigPayload];
        if (
          next === undefined ||
          next === current[field as keyof ISystemConfig]
        ) {
          continue;
        }
        await manager.save(SystemSetting, {
          key,
          value: String(next),
          updatedByUserId: userId,
        });
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityName: 'SystemSetting',
          entityId: key,
          previousValues: { value: current[field as keyof ISystemConfig] },
          newValues: { value: next },
        });
      }
    });
    return this.getEffective();
  }

  private resolve(rows: SystemSetting[]): ISystemConfig {
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    const pick = (field: keyof typeof FIELDS): string | null => {
      const { key, env } = FIELDS[field];
      const value =
        stored.get(key) ??
        (env ? this.configService.get<string>(env) : undefined);
      return value?.toString().trim() || null;
    };
    const puntoVenta = pick('arcaPuntoVenta');
    return {
      issuerRazonSocial: pick('issuerRazonSocial'),
      issuerCuit: pick('issuerCuit'),
      issuerTaxCondition: (pick('issuerTaxCondition')?.toUpperCase() ??
        null) as TaxCondition | null,
      arcaPuntoVenta: puntoVenta ? Number(puntoVenta) : null,
      operatingCurrency:
        (pick('operatingCurrency') as OperatingCurrency) ?? DEFAULT_CURRENCY,
    };
  }
}

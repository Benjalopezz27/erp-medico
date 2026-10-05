import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemSettingsService } from './system-settings.service';
import { SystemSetting } from './entities/system-setting.entity';
import { SystemConfigController } from './system-config.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseSettings } from './entities/purchase-settings.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseSettings, SystemSetting]),
    AuditModule,
  ],
  controllers: [SystemConfigController],
  providers: [SystemConfigService, SystemSettingsService],
  exports: [SystemConfigService, SystemSettingsService],
})
export class SystemConfigModule {}

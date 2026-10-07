import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../config/entities/system-setting.entity';
import { SystemConfigModule } from '../config/system-config.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingGuard } from './onboarding.guard';
import { OnboardingService } from './onboarding.service';

/** Global: los controllers operativos usan `OnboardingGuard` sin importar el módulo. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting]), SystemConfigModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingGuard],
  exports: [OnboardingService, OnboardingGuard],
})
export class OnboardingModule {}

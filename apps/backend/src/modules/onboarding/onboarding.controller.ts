import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IOnboardingStatus,
  OnboardingStepId,
  UserRole,
} from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OnboardingService } from './onboarding.service';
import { ONBOARDING_STEPS } from './onboarding.constants';

const STEP_IDS = ONBOARDING_STEPS.map((s) => s.id);

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('config')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('onboarding-status')
  @ApiOperation({ summary: 'Estado del wizard de configuración inicial' })
  status(): Promise<IOnboardingStatus> {
    return this.onboarding.getStatus();
  }

  @Post('onboarding/steps/:id/skip')
  @ApiOperation({ summary: 'Omitir un paso opcional por ahora' })
  skip(
    @Param('id', new ParseEnumPipe(STEP_IDS)) id: OnboardingStepId,
    @CurrentUser() user: User,
  ): Promise<IOnboardingStatus> {
    return this.onboarding.skip(id, user.id);
  }

  @Post('onboarding/complete')
  @ApiOperation({ summary: 'Finalizar la configuración inicial' })
  complete(@CurrentUser() user: User): Promise<IOnboardingStatus> {
    return this.onboarding.complete(user.id);
  }
}

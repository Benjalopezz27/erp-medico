import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IOnboardingStatus, UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('config')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('onboarding-status')
  @ApiOperation({ summary: 'Progreso de primeros pasos y descartes' })
  status(): Promise<IOnboardingStatus> {
    return this.onboarding.getStatus();
  }

  @Post('onboarding/dismiss')
  @ApiOperation({ summary: 'Descartar el bloque de primeros pasos' })
  dismiss(@CurrentUser() user: User): Promise<IOnboardingStatus> {
    return this.onboarding.dismiss(user.id);
  }

  @Post('hints/:id/dismiss')
  @ApiOperation({ summary: 'Descartar un cartel contextual' })
  dismissHint(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<IOnboardingStatus> {
    return this.onboarding.dismissHint(id, user.id);
  }
}

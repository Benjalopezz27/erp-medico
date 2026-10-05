import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IDashboardActivity,
  IDashboardKpis,
  UserRole,
} from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { QueryActivityDto } from './dto/query-activity.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Indicadores ejecutivos del día' })
  kpis(): Promise<IDashboardKpis> {
    return this.service.getKpis();
  }

  @Get('activity')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Actividad reciente del sistema (según rol)' })
  activity(
    @Query() query: QueryActivityDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<IDashboardActivity> {
    return this.service.getActivity(actor.role, query.limit ?? 15);
  }
}

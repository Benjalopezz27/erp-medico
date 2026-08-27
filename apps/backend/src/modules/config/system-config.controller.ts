import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IPurchaseSettings, UserRole } from '@erp/shared-types';
import { SystemConfigService } from './system-config.service';
import { UpdatePurchaseSettingsDto } from './dto/update-purchase-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('system-config')
@Controller('config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check System Config module status' })
  @ApiResponse({ status: 200, description: 'System Config module operational' })
  getStatus() {
    return this.systemConfigService.getStatus();
  }

  @Get('purchases')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar configuración global de Compras' })
  getPurchaseSettings(): Promise<IPurchaseSettings> {
    return this.systemConfigService.getPurchaseSettings();
  }

  @Patch('purchases')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar tolerancia global de costos' })
  updatePurchaseSettings(
    @Body() dto: UpdatePurchaseSettingsDto,
    @CurrentUser() user: User,
  ): Promise<IPurchaseSettings> {
    return this.systemConfigService.updatePurchaseSettings(dto, user.id);
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ICashRegisterState, UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CashRegisterService } from './cash-register.service';
import {
  CloseCashRegisterDto,
  OpenCashRegisterDto,
} from './dto/cash-register.dto';
import { OnboardingGuard } from '../onboarding/onboarding.guard';

@ApiTags('cash-register')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@UseGuards(OnboardingGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly service: CashRegisterService) {}

  @Get('current')
  @ApiOperation({ summary: 'Estado de la caja y movimientos del turno' })
  current(): Promise<ICashRegisterState> {
    return this.service.getState();
  }

  @Post('open')
  @ApiOperation({ summary: 'Abrir la caja con un saldo inicial' })
  async open(
    @Body() dto: OpenCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const { id } = await this.service.open(dto, user.id);
    return { id };
  }

  @Post('close')
  @ApiOperation({ summary: 'Cerrar la caja y registrar el arqueo' })
  async close(
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; difference: string }> {
    const closed = await this.service.close(dto, user.id);
    return { id: closed.id, difference: closed.difference! };
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ITreasuryMovementListResponse,
  ITreasurySummary,
  UserRole,
} from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateTreasuryMovementDto,
  QueryTreasuryMovementsDto,
} from './dto/treasury.dto';
import { TreasuryService } from './treasury.service';

@ApiTags('treasury')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Saldos por canal: efectivo, bancos y cheques' })
  summary(): Promise<ITreasurySummary> {
    return this.treasuryService.getSummary();
  }

  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos con filtros' })
  movements(
    @Query() query: QueryTreasuryMovementsDto,
  ): Promise<ITreasuryMovementListResponse> {
    return this.treasuryService.listMovements(query);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Movimiento manual en efectivo o bancos' })
  async createMovement(
    @Body() dto: CreateTreasuryMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string }> {
    const movement = await this.treasuryService.createManual(dto, user.id);
    return { id: movement.id };
  }
}

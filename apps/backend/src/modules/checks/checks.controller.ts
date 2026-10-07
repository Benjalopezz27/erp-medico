import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ICheckDetail, ICheckListResponse, UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ChecksService } from './checks.service';
import { QueryChecksDto } from './dto/query-checks.dto';
import { RejectCheckDto } from './dto/reject-check.dto';
import { EndorseCheckDto } from './dto/endorse-check.dto';
import { Check } from './entities/check.entity';
import { OnboardingGuard } from '../onboarding/onboarding.guard';

@ApiTags('checks')
@UseGuards(OnboardingGuard)
@Controller('checks')
export class ChecksController {
  constructor(private readonly checksService: ChecksService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Checks module status' })
  @ApiResponse({ status: 200, description: 'Checks module operational' })
  getStatus() {
    return this.checksService.getStatus();
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Listar cheques (filtros por estado y vencimiento)',
  })
  list(@Query() query: QueryChecksDto): Promise<ICheckListResponse> {
    return this.checksService.list(query);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Detalle del cheque' })
  @ApiResponse({ status: 404, description: 'Cheque inexistente' })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<ICheckDetail> {
    return this.checksService.detail(id);
  }

  @Patch(':id/to-cartera')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'RECIBIDO → EN_CARTERA' })
  @ApiResponse({ status: 409, description: 'Transición inválida' })
  toCartera(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Check> {
    return this.checksService.toCartera(id, user.id);
  }

  @Patch(':id/deposit')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'EN_CARTERA → DEPOSITADO' })
  @ApiResponse({ status: 409, description: 'Transición inválida' })
  deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Check> {
    return this.checksService.deposit(id, user.id);
  }

  @Patch(':id/endorse')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'EN_CARTERA → ENDOSADO a un proveedor' })
  @ApiResponse({ status: 404, description: 'Cheque o proveedor inexistente' })
  @ApiResponse({ status: 409, description: 'Transición inválida' })
  endorse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndorseCheckDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Check> {
    return this.checksService.endorse(id, dto.supplierId, user.id);
  }

  @Patch(':id/reject')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Rechazar cheque EN_CARTERA o DEPOSITADO y revertir el cobro (atómico)',
  })
  @ApiResponse({ status: 404, description: 'Cheque inexistente' })
  @ApiResponse({
    status: 409,
    description: 'Transición inválida o ledger inconsistente',
  })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCheckDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Check> {
    return this.checksService.reject(id, dto.reason, user.id);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IReceivableDebtorsResponse, UserRole } from '@erp/shared-types';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { QueryDebtorsDto } from './dto/query-account.dto';
import { ReceivablesQueryService } from './receivables-query.service';
import { ReceivablesService } from './receivables.service';

@ApiTags('receivables')
@ApiBearerAuth('JWT-auth')
@Controller('receivables')
export class ReceivablesController {
  constructor(
    private readonly receivablesService: ReceivablesService,
    private readonly queryService: ReceivablesQueryService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Receivables module status' })
  @ApiResponse({ status: 200, description: 'Receivables module operational' })
  getStatus() {
    return this.receivablesService.getStatus();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Rol no autorizado' })
  @ApiOperation({
    summary: 'Deudores por cliente, con saldo, antigüedad y morosidad',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de deudores' })
  listDebtors(
    @Query() query: QueryDebtorsDto,
  ): Promise<IReceivableDebtorsResponse> {
    return this.queryService.listDebtors({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    });
  }
}

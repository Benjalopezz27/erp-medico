import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { PendingFiscalService } from './services/pending-fiscal.service';
import { QueryPendingFiscalDto } from './dto/query-pending-fiscal.dto';
import {
  FiscalQueueMetricsResponseDto,
  PaginatedPendingFiscalResponseDto,
  PendingFiscalCountResponseDto,
  RetryFiscalDocumentResponseDto,
} from './dto/pending-fiscal-response.dto';

/**
 * Rutas literales bajo `sales/pending-fiscal*` — registrado ANTES de
 * `SalesController` en `SalesModule` para que Nest/Express no las capture
 * con la ruta paramétrica `GET /sales/:id`.
 */
@ApiTags('sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales/pending-fiscal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Operación no autorizada' })
export class PendingFiscalController {
  constructor(private readonly pendingFiscalService: PendingFiscalService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar documentos fiscales pendientes o rechazados',
  })
  @ApiResponse({ status: 200, type: PaginatedPendingFiscalResponseDto })
  findAll(
    @Query() query: QueryPendingFiscalDto,
  ): Promise<PaginatedPendingFiscalResponseDto> {
    return this.pendingFiscalService.findAll(query);
  }

  @Get('count')
  @ApiOperation({ summary: 'Conteo de pendientes y rechazados' })
  @ApiResponse({ status: 200, type: PendingFiscalCountResponseDto })
  count(): Promise<PendingFiscalCountResponseDto> {
    return this.pendingFiscalService.count();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas mínimas de la cola wsfe-emit' })
  @ApiResponse({ status: 200, type: FiscalQueueMetricsResponseDto })
  metrics(): Promise<FiscalQueueMetricsResponseDto> {
    return this.pendingFiscalService.metrics();
  }

  @Post(':fiscalDocumentId/retry')
  @ApiOperation({ summary: 'Reintento manual idempotente de un documento' })
  @ApiResponse({ status: 200, type: RetryFiscalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Documento inexistente' })
  @ApiResponse({ status: 409, description: 'El documento ya está EMITIDO' })
  @ApiResponse({
    status: 422,
    description: 'El documento no es reintentable en su estado actual',
  })
  retry(
    @Param('fiscalDocumentId', ParseUUIDPipe) fiscalDocumentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetryFiscalDocumentResponseDto> {
    return this.pendingFiscalService.retry(fiscalDocumentId, user.id);
  }
}

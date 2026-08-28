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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  IPaginatedPriceReviewsResponse,
  IPriceReviewDetail,
  IPriceReviewPendingCount,
  UserRole,
} from '@erp/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import {
  ApprovePriceReviewDto,
  OptionalPriceReviewReasonDto,
  RejectPriceReviewDto,
} from './dto/price-review-decision.dto';
import {
  PaginatedPriceReviewsResponseDto,
  PriceReviewPendingCountResponseDto,
  PriceReviewResponseDto,
} from './dto/price-review-response.dto';
import { QueryPriceReviewsDto } from './dto/query-price-reviews.dto';
import { PriceReviewsService } from './services/price-reviews.service';

@ApiTags('prices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('price-reviews')
export class PriceReviewsController {
  constructor(private readonly priceReviewsService: PriceReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar revisiones de precio con filtros' })
  @ApiOkResponse({ type: PaginatedPriceReviewsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  findAll(
    @Query() query: QueryPriceReviewsDto,
  ): Promise<IPaginatedPriceReviewsResponse> {
    return this.priceReviewsService.findAll(query);
  }

  // Keep static routes before :id so they are never parsed as UUIDs.
  @Get('pending-count')
  @ApiOperation({ summary: 'Contar revisiones en estado pendiente' })
  @ApiOkResponse({ type: PriceReviewPendingCountResponseDto })
  getPendingCount(): Promise<IPriceReviewPendingCount> {
    return this.priceReviewsService.getPendingCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una revisión de precio' })
  @ApiOkResponse({ type: PriceReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Revisión inexistente' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<IPriceReviewDetail> {
    return this.priceReviewsService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: 'Aprobar el precio sugerido o un precio custom',
  })
  @ApiOkResponse({ type: PriceReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Precio custom o motivo inválido' })
  @ApiNotFoundResponse({ description: 'Revisión inexistente' })
  @ApiConflictResponse({
    description: 'Revisión resuelta, superada o incompatible con el producto',
  })
  approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ApprovePriceReviewDto,
    @CurrentUser() user: User,
  ): Promise<IPriceReviewDetail> {
    return this.priceReviewsService.approve(id, dto, user.id);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rechazar la propuesta y mantener el precio activo',
  })
  @ApiOkResponse({ type: PriceReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Motivo obligatorio inválido' })
  @ApiConflictResponse({ description: 'Transición incompatible' })
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectPriceReviewDto,
    @CurrentUser() user: User,
  ): Promise<IPriceReviewDetail> {
    return this.priceReviewsService.reject(id, dto.reason, user.id);
  }

  @Patch(':id/postpone')
  @ApiOperation({ summary: 'Posponer una revisión sin cambiar el precio' })
  @ApiOkResponse({ type: PriceReviewResponseDto })
  @ApiConflictResponse({ description: 'Transición incompatible' })
  postpone(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: OptionalPriceReviewReasonDto,
    @CurrentUser() user: User,
  ): Promise<IPriceReviewDetail> {
    return this.priceReviewsService.postpone(id, dto.reason, user.id);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reabrir una revisión pospuesta' })
  @ApiOkResponse({ type: PriceReviewResponseDto })
  @ApiConflictResponse({ description: 'Transición incompatible' })
  reopen(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: OptionalPriceReviewReasonDto,
    @CurrentUser() user: User,
  ): Promise<IPriceReviewDetail> {
    return this.priceReviewsService.reopen(id, dto.reason, user.id);
  }
}

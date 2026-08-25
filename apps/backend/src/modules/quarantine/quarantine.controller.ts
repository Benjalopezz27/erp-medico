import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@erp/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { QuarantineService } from './quarantine.service';
import {
  CreateQuarantineDto,
  QueryQuarantineDto,
  ResolveQuarantineDto,
  QuarantineStockResponseDto,
  PaginatedQuarantineResponseDto,
} from './dto';

@ApiTags('quarantine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('quarantine')
export class QuarantineController {
  constructor(private readonly quarantineService: QuarantineService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Transfer available stock to quarantine',
    description:
      'Deducts available inventory via AJUSTE_SALIDA and creates a quarantine entry. (ADMINISTRADOR only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock successfully quarantined',
    type: QuarantineStockResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or product is inactive',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - insufficient available stock',
  })
  async create(
    @Body() dto: CreateQuarantineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuarantineStockResponseDto> {
    return this.quarantineService.createEntry(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List paginated quarantine records',
    description:
      'Returns paginated quarantine entries with filters by product, search term, and status. (ADMINISTRADOR only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated quarantine stock list',
    type: PaginatedQuarantineResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  async findAll(
    @Query() query: QueryQuarantineDto,
  ): Promise<PaginatedQuarantineResponseDto> {
    return this.quarantineService.findAll(query);
  }

  @Patch(':id/resolve')
  @ApiOperation({
    summary: 'Resolve a quarantine stock entry',
    description:
      'Atomically resolves quarantine entry as MERMA, DEVOLUCION_PROVEEDOR, or REINGRESO (with AJUSTE_ENTRADA). (ADMINISTRADOR only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Quarantine entry UUID v4',
  })
  @ApiResponse({
    status: 200,
    description: 'Quarantine entry successfully resolved',
    type: QuarantineStockResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing resolution notes',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMINISTRADOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Quarantine record not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - quarantine entry is already resolved',
  })
  async resolve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ResolveQuarantineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuarantineStockResponseDto> {
    return this.quarantineService.resolve(id, dto, user.id);
  }
}

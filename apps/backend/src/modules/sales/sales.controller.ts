import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@erp/shared-types';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CreateSaleDto,
  FiscalDocumentPreviewResponseDto,
  FiscalDocumentResponseDto,
  PaginatedSalesResponseDto,
  QuerySalesDto,
  SaleResponseDto,
} from './dto';
import { RetryFiscalDocumentResponseDto } from './dto/pending-fiscal-response.dto';
import { SalesService } from './sales.service';
import { OnboardingGuard } from '../onboarding/onboarding.guard';

@ApiTags('sales')
@ApiBearerAuth('JWT-auth')
@UseGuards(OnboardingGuard)
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Operación no autorizada' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirmar una venta atómica' })
  @ApiResponse({ status: 201, type: SaleResponseDto })
  @ApiResponse({ status: 400, description: 'Contrato comercial inválido' })
  @ApiResponse({ status: 404, description: 'Cliente o producto inexistente' })
  @ApiResponse({
    status: 409,
    description: 'Referencia inactiva o conflicto concurrente',
  })
  @ApiResponse({ status: 422, description: 'Stock insuficiente' })
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaleResponseDto> {
    return this.salesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ventas con filtros y paginación' })
  @ApiResponse({ status: 200, type: PaginatedSalesResponseDto })
  findAll(@Query() query: QuerySalesDto): Promise<PaginatedSalesResponseDto> {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar el detalle completo de una venta' })
  @ApiResponse({ status: 200, type: SaleResponseDto })
  @ApiResponse({ status: 404, description: 'Venta inexistente' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SaleResponseDto> {
    return this.salesService.findOne(id);
  }

  @Get(':id/fiscal-document')
  @ApiOperation({
    summary: 'Consultar el estado y datos fiscales autorizados de una venta',
  })
  @ApiResponse({ status: 200, type: FiscalDocumentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Venta inexistente o sin comprobante fiscal',
  })
  findFiscalDocument(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FiscalDocumentResponseDto> {
    return this.salesService.findFiscalDocument(id);
  }

  @Get(':id/fiscal-document/preview')
  @ApiOperation({
    summary:
      'Ver el preview del comprobante a emitir (tipo calculado, receptor, ítems, totales) sin llamar a ARCA',
  })
  @ApiResponse({ status: 200, type: FiscalDocumentPreviewResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Venta inexistente o sin comprobante fiscal',
  })
  previewFiscalDocument(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FiscalDocumentPreviewResponseDto> {
    return this.salesService.previewFiscalDocument(id);
  }

  @Post(':id/fiscal-document/emit')
  @ApiOperation({ summary: 'Disparar la emisión del comprobante fiscal' })
  @ApiResponse({ status: 200, type: RetryFiscalDocumentResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Venta inexistente o sin comprobante fiscal',
  })
  @ApiResponse({ status: 409, description: 'El comprobante ya está EMITIDO' })
  @ApiResponse({
    status: 422,
    description: 'El comprobante no es emitible en su estado actual',
  })
  emitFiscalDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RetryFiscalDocumentResponseDto> {
    return this.salesService.emitFiscalDocument(id, user.id);
  }

  @Get(':id/fiscal-document/pdf')
  @ApiOperation({ summary: 'Descargar el PDF del comprobante fiscal' })
  @ApiResponse({ status: 200, description: 'PDF del comprobante fiscal' })
  @ApiResponse({
    status: 404,
    description: 'Venta inexistente o sin comprobante fiscal',
  })
  @ApiResponse({
    status: 409,
    description: 'El PDF todavía no está disponible',
  })
  async downloadFiscalDocumentPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } =
      await this.salesService.getFiscalDocumentPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/fiscal-document/qr')
  @ApiOperation({ summary: 'Obtener la imagen del QR fiscal oficial' })
  @ApiResponse({ status: 200, description: 'Imagen PNG del QR fiscal' })
  @ApiResponse({
    status: 404,
    description: 'Venta inexistente o sin comprobante fiscal',
  })
  @ApiResponse({
    status: 409,
    description: 'El QR todavía no está disponible',
  })
  async getFiscalDocumentQr(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.salesService.getFiscalDocumentQr(id);
    res.set({ 'Content-Type': 'image/png' });
    return new StreamableFile(buffer);
  }
}

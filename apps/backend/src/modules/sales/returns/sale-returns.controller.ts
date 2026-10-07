import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CreateSaleReturnDto, SaleReturnResponseDto } from './dto';
import { SaleReturnsService } from './services/sale-returns.service';
import { OnboardingGuard } from '../../onboarding/onboarding.guard';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseGuards(OnboardingGuard)
@Controller('sales')
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Post(':id/returns')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Registrar una devolución sobre una venta confirmada',
    description:
      'Registra la devolución parcial o total de ítems de una venta confirmada con control de calidad (APTO / NO_APTO).',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SaleReturnResponseDto,
    description: 'Devolución registrada exitosamente.',
  })
  createReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSaleReturnDto,
    @CurrentUser('id') userId: string,
  ): Promise<SaleReturnResponseDto> {
    return this.saleReturnsService.createReturn(id, dto, userId);
  }

  @Get(':id/returns')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Consultar el historial de devoluciones de una venta',
    description:
      'Devuelve la lista de devoluciones registradas para la venta indicada.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [SaleReturnResponseDto],
    description: 'Historial de devoluciones de la venta.',
  })
  findReturnsBySaleId(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SaleReturnResponseDto[]> {
    return this.saleReturnsService.findReturnsBySaleId(id);
  }

  @Get(':id/returns/:returnId/fiscal-document/pdf')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Descargar el PDF de la Nota de Crédito de una devolución',
  })
  @ApiResponse({ status: 200, description: 'PDF de la Nota de Crédito' })
  @ApiResponse({
    status: 404,
    description: 'Devolución inexistente o sin Nota de Crédito',
  })
  @ApiResponse({
    status: 409,
    description: 'El PDF todavía no está disponible',
  })
  async downloadFiscalDocumentPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('returnId', ParseUUIDPipe) returnId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } =
      await this.saleReturnsService.getFiscalDocumentPdf(id, returnId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/returns/:returnId/fiscal-document/qr')
  @Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
  @ApiOperation({
    summary: 'Obtener el QR fiscal de la Nota de Crédito de una devolución',
  })
  @ApiResponse({ status: 200, description: 'Imagen PNG del QR fiscal' })
  @ApiResponse({
    status: 404,
    description: 'Devolución inexistente o sin Nota de Crédito',
  })
  @ApiResponse({
    status: 409,
    description: 'El QR todavía no está disponible',
  })
  async getFiscalDocumentQr(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('returnId', ParseUUIDPipe) returnId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.saleReturnsService.getFiscalDocumentQr(
      id,
      returnId,
    );
    res.set({ 'Content-Type': 'image/png' });
    return new StreamableFile(buffer);
  }
}

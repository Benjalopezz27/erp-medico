import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IReceiptDetail, UserRole } from '@erp/shared-types';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { ReceiptPdfService } from './receipt-pdf.service';
import { ReceiptsService } from './receipts.service';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Rol no autorizado' })
@ApiResponse({ status: 404, description: 'Recibo inexistente' })
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly pdfService: ReceiptPdfService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del recibo con comprobantes aplicados' })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<IReceiptDetail> {
    return this.receiptsService.getDetail(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Recibo en PDF A4' })
  @ApiResponse({ status: 200, description: 'PDF (application/pdf)' })
  async getPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const receipt = await this.receiptsService.getDetail(id);
    const bytes = await this.pdfService.render({
      receipt,
      emisor: {
        razonSocial:
          this.config.get<string>('ARCA_EMISOR_RAZON_SOCIAL') ??
          'Emisor no configurado',
        cuit: this.config.get<string>('ARCA_CUIT') ?? '',
      },
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-${receipt.receiptNumber}.pdf"`,
    });
    return new StreamableFile(bytes);
  }
}

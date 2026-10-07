import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SystemSettingsService } from '../config/system-settings.service';
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
import { OnboardingGuard } from '../onboarding/onboarding.guard';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(OnboardingGuard)
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
    private readonly settings: SystemSettingsService,
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
    const issuer = await this.settings.getIssuer();
    const bytes = await this.pdfService.render({
      receipt,
      emisor: {
        razonSocial: issuer.razonSocial ?? 'Emisor no configurado',
        cuit: issuer.cuit ?? '',
      },
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-${receipt.receiptNumber}.pdf"`,
    });
    return new StreamableFile(bytes);
  }
}

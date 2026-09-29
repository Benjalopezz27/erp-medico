import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ICustomerAccountResponse, UserRole } from '@erp/shared-types';
import { Response } from 'express';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import {
  AccountStatementPdfService,
  statementFilenameDay,
} from './account-statement-pdf.service';
import { QueryLedgerDto } from './dto/query-account.dto';
import { ReceivablesQueryService } from './receivables-query.service';

@ApiTags('receivables')
@ApiBearerAuth('JWT-auth')
@Controller('customers/:id/account-receivable')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.VENDEDOR)
@ApiResponse({ status: 401, description: 'No autenticado' })
@ApiResponse({ status: 403, description: 'Rol no autorizado' })
@ApiResponse({ status: 404, description: 'Cliente inexistente' })
export class CustomerAccountController {
  constructor(
    private readonly queryService: ReceivablesQueryService,
    private readonly pdfService: AccountStatementPdfService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Estado de cuenta del cliente: resumen, facturas pendientes y ledger',
  })
  getAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryLedgerDto,
  ): Promise<ICustomerAccountResponse> {
    return this.queryService.getCustomerAccount(
      id,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Resumen de Cuenta del cliente en PDF' })
  @ApiResponse({ status: 200, description: 'PDF A4 (application/pdf)' })
  async getStatementPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const [summary, pendingInvoices, ledger] = await Promise.all([
      this.queryService.getSummary(id),
      this.queryService.getPendingInvoices(id),
      this.queryService.getLedger(id, 1, null),
    ]);
    const issuedAt = new Date();
    const bytes = await this.pdfService.render({
      summary,
      pendingInvoices,
      ledger: ledger.data,
      issuedAt,
    });
    const day = statementFilenameDay(issuedAt);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resumen-cuenta-${summary.customerDocument}-${day}.pdf"`,
    });
    return new StreamableFile(bytes);
  }
}

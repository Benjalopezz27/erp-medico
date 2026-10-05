import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@erp/shared-types';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { ExportService } from './export.service';
import {
  REPORT_DEFINITIONS,
  ReportDefinition,
  ReportResult,
} from './report.types';

const FORMATS = ['json', 'excel', 'pdf'];
const FILES = {
  excel: {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  pdf: { ext: 'pdf', mime: 'application/pdf' },
} as const;

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(REPORT_DEFINITIONS)
    private readonly definitions: ReportDefinition[],
    private readonly exporter: ExportService,
  ) {}

  @Get(':type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Generar reporte en json, excel o pdf' })
  async run(
    @Param('type') type: string,
    @Query() query: Record<string, string>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReportResult | StreamableFile> {
    const definition = this.definitions.find((d) => d.type === type);
    if (!definition)
      throw new NotFoundException(`Reporte "${type}" inexistente`);
    const { format = 'json', ...filters } = query;
    if (!FORMATS.includes(format)) {
      throw new BadRequestException(`format inválido: ${format}`);
    }

    const report = await definition.generate(filters);
    if (format === 'json') return report;

    const file = FILES[format as keyof typeof FILES];
    const buffer =
      format === 'excel'
        ? await this.exporter.toExcel(report.title, report.columns, report.rows)
        : await this.exporter.toPdf(report.title, report.columns, report.rows);
    res.set({
      'Content-Type': file.mime,
      'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.${file.ext}"`,
    });
    return new StreamableFile(buffer);
  }
}

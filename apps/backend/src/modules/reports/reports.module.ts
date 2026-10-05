import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ReportsController } from './reports.controller';
import { REPORT_DEFINITIONS } from './report.types';

// Cada reporte (US-37..45) se agrega a `providers` y a `inject` de la factory.
@Module({
  controllers: [ReportsController],
  providers: [
    ExportService,
    { provide: REPORT_DEFINITIONS, useFactory: () => [], inject: [] },
  ],
  exports: [ExportService],
})
export class ReportsModule {}

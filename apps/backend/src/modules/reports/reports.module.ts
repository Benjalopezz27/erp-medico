import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REPORT_SPECS } from './definitions';
import { ExportService } from './export.service';
import { ReportsController } from './reports.controller';
import { REPORT_DEFINITIONS } from './report.types';
import { createSqlReport } from './sql-report';

// Un reporte nuevo es una spec en `definitions/` registrada en `REPORT_SPECS`.
@Module({
  controllers: [ReportsController],
  providers: [
    ExportService,
    {
      provide: REPORT_DEFINITIONS,
      useFactory: (dataSource: DataSource) =>
        REPORT_SPECS.map((spec) => createSqlReport(dataSource, spec)),
      inject: [DataSource],
    },
  ],
  exports: [ExportService],
})
export class ReportsModule {}

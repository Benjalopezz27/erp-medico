import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImporterService } from './importer.service';
import { ImporterController } from './importer.controller';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AuditModule } from '../audit/audit.module';
import { SupplierImportTemplate } from './entities/supplier-import-template.entity';
import { SupplierImportTemplatesService } from './services/supplier-import-templates.service';
import { SupplierImportTemplatesController } from './controllers/supplier-import-templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierImportTemplate]),
    SuppliersModule,
    AuditModule,
  ],
  controllers: [ImporterController, SupplierImportTemplatesController],
  providers: [ImporterService, SupplierImportTemplatesService],
  exports: [ImporterService, SupplierImportTemplatesService, TypeOrmModule],
})
export class ImporterModule {}

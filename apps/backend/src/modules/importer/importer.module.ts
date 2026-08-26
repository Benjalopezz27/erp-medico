import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImporterService } from './importer.service';
import { ImporterController } from './importer.controller';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { AuditModule } from '../audit/audit.module';
import { SupplierImportTemplate } from './entities/supplier-import-template.entity';
import { SupplierImportBatch } from './entities/supplier-import-batch.entity';
import { SupplierImportBatchItem } from './entities/supplier-import-batch-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../suppliers/supplier-products/entities/supplier-product.entity';
import { SupplierImportTemplatesService } from './services/supplier-import-templates.service';
import { SupplierImportTemplatesController } from './controllers/supplier-import-templates.controller';
import { ImporterPreviewService } from './services/importer-preview.service';
import { ImporterRowValidatorService } from './services/importer-row-validator.service';
import { ImporterConfirmationService } from './services/importer-confirmation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierImportTemplate,
      SupplierImportBatch,
      SupplierImportBatchItem,
      Supplier,
      SupplierProduct,
    ]),
    SuppliersModule,
    AuditModule,
  ],
  controllers: [ImporterController, SupplierImportTemplatesController],
  providers: [
    ImporterService,
    SupplierImportTemplatesService,
    ImporterPreviewService,
    ImporterRowValidatorService,
    ImporterConfirmationService,
  ],
  exports: [
    ImporterService,
    SupplierImportTemplatesService,
    ImporterPreviewService,
    ImporterRowValidatorService,
    ImporterConfirmationService,
    TypeOrmModule,
  ],
})
export class ImporterModule {}

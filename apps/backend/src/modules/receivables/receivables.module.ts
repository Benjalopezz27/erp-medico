import { Module } from '@nestjs/common';
import { ReceivablesService } from './receivables.service';
import { ReceivablesController } from './receivables.controller';
import { CustomerAccountController } from './customer-account.controller';
import { AccountStatementPdfService } from './account-statement-pdf.service';
import { ReceivablesQueryService } from './receivables-query.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';
import { AccountReceivableMovement } from './entities/account-receivable-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountReceivable, AccountReceivableMovement]),
  ],
  controllers: [ReceivablesController, CustomerAccountController],
  providers: [
    ReceivablesService,
    ReceivablesQueryService,
    AccountStatementPdfService,
  ],
  exports: [ReceivablesService, ReceivablesQueryService, TypeOrmModule],
})
export class ReceivablesModule {}

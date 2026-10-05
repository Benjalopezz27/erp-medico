import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceivablesModule } from '../receivables/receivables.module';
import { Check } from '../checks/entities/check.entity';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { Receipt } from './entities/receipt.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ReceiptNumberService } from './receipt-number.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { TreasuryModule } from '../treasury/treasury.module';
import { SystemConfigModule } from '../config/system-config.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAllocation, Receipt, Check]),
    ReceivablesModule,
    SystemConfigModule,
    TreasuryModule,
  ],
  controllers: [PaymentsController, ReceiptsController],
  providers: [
    PaymentsService,
    ReceiptNumberService,
    ReceiptsService,
    ReceiptPdfService,
  ],
  exports: [PaymentsService, ReceiptsService],
})
export class PaymentsModule {}

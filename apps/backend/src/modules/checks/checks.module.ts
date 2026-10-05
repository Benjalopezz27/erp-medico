import { TreasuryModule } from '../treasury/treasury.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { ChecksController } from './checks.controller';
import { ChecksService } from './checks.service';
import { Check } from './entities/check.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Check]),
    AuditModule,
    ReceivablesModule,
    TreasuryModule,
  ],
  controllers: [ChecksController],
  providers: [ChecksService],
  exports: [ChecksService],
})
export class ChecksModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashRegister } from './entities/cash-register.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashRegister]),
    AuditModule,
    TreasuryModule,
  ],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
})
export class CashRegisterModule {}

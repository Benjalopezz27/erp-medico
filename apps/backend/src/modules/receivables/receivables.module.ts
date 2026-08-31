import { Module } from '@nestjs/common';
import { ReceivablesService } from './receivables.service';
import { ReceivablesController } from './receivables.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountReceivable } from './entities/account-receivable.entity';
import { AccountReceivableMovement } from './entities/account-receivable-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountReceivable, AccountReceivableMovement]),
  ],
  controllers: [ReceivablesController],
  providers: [ReceivablesService],
  exports: [ReceivablesService, TypeOrmModule],
})
export class ReceivablesModule {}

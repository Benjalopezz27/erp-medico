import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreasuryAccount } from './entities/treasury-account.entity';
import { TreasuryMovement } from './entities/treasury-movement.entity';
import { TreasuryService } from './treasury.service';
import { TreasuryController } from './treasury.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TreasuryAccount, TreasuryMovement])],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],
})
export class TreasuryModule {}

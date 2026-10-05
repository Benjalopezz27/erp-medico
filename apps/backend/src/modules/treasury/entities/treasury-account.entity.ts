import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TreasuryAccountType } from '@erp/shared-types';

@Entity('treasury_accounts')
export class TreasuryAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_type', type: 'varchar', length: 20, unique: true })
  accountType: TreasuryAccountType;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

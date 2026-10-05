import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TreasuryMovementType } from '@erp/shared-types';
import { User } from '../../users/entities/user.entity';
import { TreasuryAccount } from './treasury-account.entity';

/** Libro append-only: un trigger de la base impide UPDATE y DELETE. */
@Entity('treasury_movements')
export class TreasuryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'treasury_account_id', type: 'uuid' })
  treasuryAccountId: string;

  @ManyToOne(() => TreasuryAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'treasury_account_id' })
  account?: TreasuryAccount;

  @Column({ name: 'movement_type', type: 'varchar', length: 10 })
  movementType: TreasuryMovementType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 200 })
  concept: string;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

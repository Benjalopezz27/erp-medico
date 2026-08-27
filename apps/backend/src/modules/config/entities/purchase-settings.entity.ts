import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('purchase_settings')
export class PurchaseSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({
    name: 'cost_tolerance_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
  })
  costTolerancePercentage: string;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedBy?: User | null;
}

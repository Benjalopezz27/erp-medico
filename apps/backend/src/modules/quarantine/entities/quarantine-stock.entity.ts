import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuarantineStatus } from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { StockMovement } from '../../stock/entities/stock-movement.entity';

@Entity('quarantine_stocks')
export class QuarantineStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'quantity_base',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  quantityBase: string | number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: QuarantineStatus.EN_CUARENTENA,
  })
  status: QuarantineStatus;

  @Column({ name: 'entry_actor_id', type: 'uuid' })
  entryActorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'entry_actor_id' })
  entryActor: User;

  @Column({ name: 'entry_movement_id', type: 'uuid' })
  entryMovementId: string;

  @ManyToOne(() => StockMovement)
  @JoinColumn({ name: 'entry_movement_id' })
  entryMovement: StockMovement;

  @Column({ name: 'resolved_by_actor_id', type: 'uuid', nullable: true })
  resolvedByActorId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by_actor_id' })
  resolvedByActor: User | null;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ name: 'resolution_movement_id', type: 'uuid', nullable: true })
  resolutionMovementId: string | null;

  @ManyToOne(() => StockMovement, { nullable: true })
  @JoinColumn({ name: 'resolution_movement_id' })
  resolutionMovement: StockMovement | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

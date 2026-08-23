import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockMovementType } from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({
    name: 'movement_type',
    type: 'varchar',
    length: 50,
  })
  movementType: StockMovementType;

  @Column({
    name: 'quantity_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  quantityBase: string | number;

  @Column({
    name: 'previous_stock',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  previousStock: string | number;

  @Column({
    name: 'subsequent_stock',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  subsequentStock: string | number;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    name: 'document_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  documentReference: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

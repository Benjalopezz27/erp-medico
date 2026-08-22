import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Unit } from '../../units/entities/unit.entity';

@Entity('product_unit_conversions')
export class ProductUnitConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'presentation_unit_id', type: 'uuid' })
  presentationUnitId: string;

  @Column({
    name: 'conversion_factor',
    type: 'numeric',
    precision: 10,
    scale: 4,
  })
  conversionFactor: string | number;

  @ManyToOne(() => Product, (product) => product.conversions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'presentation_unit_id' })
  presentationUnit?: Unit;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

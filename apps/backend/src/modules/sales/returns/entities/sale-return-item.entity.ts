import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductTaxTreatment, SaleReturnItemQuality } from '@erp/shared-types';
import { Product } from '../../../products/entities/product.entity';
import { StockMovement } from '../../../stock/entities/stock-movement.entity';
import { QuarantineStock } from '../../../quarantine/entities/quarantine-stock.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { SaleReturn } from './sale-return.entity';

@Entity('sale_return_items')
export class SaleReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_return_id', type: 'uuid' })
  saleReturnId: string;

  @ManyToOne(() => SaleReturn, (sr) => sr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_return_id' })
  saleReturn: SaleReturn;

  @Column({ name: 'sale_item_id', type: 'uuid' })
  saleItemId: string;

  @ManyToOne(() => SaleItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem: SaleItem;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'quantity_base',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  quantityBase: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  quality: SaleReturnItemQuality;

  @Column({
    name: 'unit_price_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  unitPriceNet: string;

  @Column({
    name: 'tax_treatment',
    type: 'varchar',
    length: 20,
  })
  taxTreatment: ProductTaxTreatment;

  @Column({
    name: 'iva_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  ivaPercentage: string | null;

  @Column({
    name: 'subtotal_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  subtotalNet: string;

  @Column({
    name: 'iva_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  ivaAmount: string;

  @Column({
    name: 'subtotal_gross',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  subtotalGross: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'stock_movement_id', type: 'uuid', nullable: true })
  stockMovementId: string | null;

  @ManyToOne(() => StockMovement, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_movement_id' })
  stockMovement?: StockMovement | null;

  @OneToOne(() => QuarantineStock, (qs) => qs.saleReturnItem, {
    nullable: true,
  })
  quarantineStock?: QuarantineStock | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

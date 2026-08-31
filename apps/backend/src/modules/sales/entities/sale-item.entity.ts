import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CustomerPricingRuleApplied,
  ProductTaxTreatment,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'item_index', type: 'integer' })
  itemIndex: number;

  @Column({ name: 'quantity_base', type: 'numeric', precision: 14, scale: 2 })
  quantityBase: string;

  @Column({
    name: 'catalog_price_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  catalogPriceNet: string;

  @Column({ name: 'pricing_rule_applied', type: 'varchar', length: 30 })
  pricingRuleApplied: CustomerPricingRuleApplied;

  @Column({ name: 'pricing_rule_id', type: 'uuid', nullable: true })
  pricingRuleId: string | null;

  @Column({
    name: 'discount_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    nullable: true,
  })
  discountPercentage: string | null;

  @Column({
    name: 'discount_amount_net',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  discountAmountNet: string;

  @Column({ name: 'unit_price_net', type: 'numeric', precision: 14, scale: 2 })
  unitPriceNet: string;

  @Column({ name: 'subtotal_net', type: 'numeric', precision: 14, scale: 2 })
  subtotalNet: string;

  @Column({ name: 'tax_treatment', type: 'varchar', length: 20 })
  taxTreatment: ProductTaxTreatment;

  @Column({
    name: 'iva_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  ivaPercentage: string | null;

  @Column({ name: 'iva_amount', type: 'numeric', precision: 14, scale: 2 })
  ivaAmount: string;

  @Column({ name: 'subtotal_gross', type: 'numeric', precision: 14, scale: 2 })
  subtotalGross: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}

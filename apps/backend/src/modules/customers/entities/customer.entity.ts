import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_name', type: 'varchar', length: 200 })
  businessName: string;

  @Column({ name: 'document_type', type: 'varchar', length: 20 })
  documentType: CustomerDocumentType;

  @Column({ name: 'cuit_or_dni', type: 'varchar', length: 11, unique: true })
  cuitOrDni: string;

  @Column({ name: 'tax_condition', type: 'varchar', length: 50 })
  taxCondition: TaxCondition;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  creditLimit: string;

  @Column({
    name: 'general_discount_percentage',
    type: 'numeric',
    precision: 7,
    scale: 4,
    default: '0.0000',
  })
  generalDiscountPercentage: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

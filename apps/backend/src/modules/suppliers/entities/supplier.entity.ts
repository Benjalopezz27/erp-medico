import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaxCondition } from '@erp/shared-types';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_name', type: 'varchar', length: 200 })
  businessName: string;

  @Column({ name: 'cuit', type: 'varchar', length: 11, unique: true })
  cuit: string;

  @Column({ name: 'tax_condition', type: 'varchar', length: 50 })
  taxCondition: TaxCondition;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'whatsapp', type: 'varchar', length: 50, nullable: true })
  whatsapp: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

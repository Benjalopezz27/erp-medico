import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'opened_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  openedAt: Date;

  @Column({ name: 'opened_by', type: 'uuid' })
  openedBy: string;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 14, scale: 2 })
  openingBalance: string;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy: string | null;

  @Column({
    name: 'expected_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  expectedBalance: string | null;

  @Column({
    name: 'actual_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  actualBalance: string | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  difference: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  observation: string | null;
}

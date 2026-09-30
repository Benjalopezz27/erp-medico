import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ArcaStatus,
  FiscalDocumentType,
  FiscalErrorCode,
  FiscalFailureStage,
  PdfArtifactStatus,
} from '@erp/shared-types';
import { Sale } from './sale.entity';
import { SaleReturn } from '../returns/entities/sale-return.entity';

@Entity('fiscal_documents')
export class FiscalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @Column({ name: 'sale_return_id', type: 'uuid', nullable: true })
  saleReturnId: string | null;

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  documentType: FiscalDocumentType | null;

  @Column({ name: 'point_of_sale', type: 'integer', nullable: true })
  pointOfSale: number | null;

  @Column({ name: 'document_number', type: 'integer', nullable: true })
  documentNumber: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cae: string | null;

  @Column({ name: 'cae_expiration_date', type: 'date', nullable: true })
  caeExpirationDate: string | null;

  @Column({
    name: 'arca_status',
    type: 'varchar',
    length: 30,
    default: ArcaStatus.PENDIENTE_FACTURACION,
  })
  arcaStatus: ArcaStatus;

  @Column({ name: 'arca_error_message', type: 'text', nullable: true })
  arcaErrorMessage: string | null;

  @Column({ name: 'attempt_count', type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt: Date | null;

  @Column({
    name: 'failure_stage',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  failureStage: FiscalFailureStage | null;

  @Column({
    name: 'arca_error_code',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  arcaErrorCode: FiscalErrorCode | null;

  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'pdf_data', type: 'bytea', nullable: true })
  pdfData: Buffer | null;

  @Column({ name: 'pdf_checksum', type: 'varchar', length: 64, nullable: true })
  pdfChecksum: string | null;

  @Column({ name: 'pdf_size_bytes', type: 'integer', nullable: true })
  pdfSizeBytes: number | null;

  @Column({
    name: 'pdf_template_version',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  pdfTemplateVersion: string | null;

  @Column({ name: 'pdf_generated_at', type: 'timestamptz', nullable: true })
  pdfGeneratedAt: Date | null;

  @Column({
    name: 'pdf_status',
    type: 'varchar',
    length: 20,
    default: PdfArtifactStatus.PENDIENTE,
  })
  pdfStatus: PdfArtifactStatus;

  @Column({ name: 'pdf_error_message', type: 'text', nullable: true })
  pdfErrorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Sale, (sale) => sale.fiscalDocuments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sale_id' })
  sale?: Sale;

  @OneToOne(() => SaleReturn, (sr) => sr.fiscalDocument, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sale_return_id' })
  saleReturn?: SaleReturn | null;
}

import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import { Customer } from '../../customers/entities/customer.entity';

export interface FiscalReceiverDocument {
  /** AFIP receiver document type: 80 (CUIT), 96 (DNI), 99 (Consumidor Final / sin dato). */
  docType: number;
  docNumber: string;
}

/**
 * Resolves the AFIP receiver document (WSFE `DocTipo`/`DocNro`, QR
 * `tipoDocRec`/`nroDocRec`) for a comprobante — shared by the WSFE emission
 * request and the QR payload so both always agree on the same receiver
 * identification for the same sale.
 */
export function resolveReceiverDocument(
  customer: Customer | null,
): FiscalReceiverDocument {
  if (!customer) {
    return { docType: 99, docNumber: '0' };
  }
  return {
    docType: customer.documentType === CustomerDocumentType.CUIT ? 80 : 96,
    docNumber: customer.cuitOrDni,
  };
}

const IVA_CONDITION_ID: Record<TaxCondition, number> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]: 1,
  [TaxCondition.EXENTO]: 4,
  [TaxCondition.CONSUMIDOR_FINAL]: 5,
  [TaxCondition.MONOTRIBUTO]: 6,
};

/** WSFE `CondicionIVAReceptorId` (RG 5616); sin cliente = Consumidor Final. */
export function resolveReceiverIvaConditionId(
  customer: Customer | null,
): number {
  return (customer && IVA_CONDITION_ID[customer.taxCondition]) || 5;
}

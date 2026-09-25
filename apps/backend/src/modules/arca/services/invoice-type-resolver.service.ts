import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CustomerDocumentType,
  FiscalDocumentType,
  TaxCondition,
} from '@erp/shared-types';

export interface InvoiceTypeCustomer {
  taxCondition: TaxCondition;
  documentType: CustomerDocumentType;
}

/**
 * Resolves Factura A vs Factura B authoritatively from persisted fiscal data
 * only (issuer condition + customer condition/document type) — never from
 * frontend input. Only a RESPONSABLE_INSCRIPTO issuer can bill Factura A, and
 * only to a customer that is itself RESPONSABLE_INSCRIPTO or MONOTRIBUTO with
 * a CUIT. Every other case (no customer, CONSUMIDOR_FINAL, EXENTO, no CUIT)
 * resolves to Factura B.
 */
@Injectable()
export class InvoiceTypeResolverService {
  constructor(private readonly configService: ConfigService) {}

  resolve(customer: InvoiceTypeCustomer | null): FiscalDocumentType {
    if (this.emisorTaxCondition() !== TaxCondition.RESPONSABLE_INSCRIPTO) {
      return FiscalDocumentType.FACTURA_B;
    }
    if (!customer) {
      return FiscalDocumentType.FACTURA_B;
    }

    const customerIsEligible =
      (customer.taxCondition === TaxCondition.RESPONSABLE_INSCRIPTO ||
        customer.taxCondition === TaxCondition.MONOTRIBUTO) &&
      customer.documentType === CustomerDocumentType.CUIT;

    return customerIsEligible
      ? FiscalDocumentType.FACTURA_A
      : FiscalDocumentType.FACTURA_B;
  }

  private emisorTaxCondition(): TaxCondition {
    const configured = this.configService
      .get<string>('ARCA_EMISOR_TAX_CONDITION')
      ?.trim()
      .toUpperCase();
    return (configured as TaxCondition) || TaxCondition.RESPONSABLE_INSCRIPTO;
  }
}

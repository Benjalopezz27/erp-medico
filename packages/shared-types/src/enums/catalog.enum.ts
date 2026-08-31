export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ProductTaxTreatment {
  GRAVADO = 'GRAVADO',
  EXENTO = 'EXENTO',
  NO_GRAVADO = 'NO_GRAVADO',
}

export const PRODUCT_IVA_RATES = [0, 2.5, 5, 10.5, 21, 27] as const;

export enum ProductTaxErrorCode {
  PRODUCT_TAX_CONFIGURATION_INVALID = 'PRODUCT_TAX_CONFIGURATION_INVALID',
}

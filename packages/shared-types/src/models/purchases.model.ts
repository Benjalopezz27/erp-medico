import { PurchaseOrderStatus, SupplierInvoiceStatus } from '../enums/purchases.enum';

export interface IPurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPriceNet: number;
  subtotalNet: number;
}

export interface IPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  totalNet: number;
  notes?: string | null;
  items?: IPurchaseOrderItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IGoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  productId: string;
  quantityReceivedBase: number;
  conversionFactorUsed: number;
}

export interface IGoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string | null;
  supplierId: string;
  deliveryNoteNumber?: string | null;
  items?: IGoodsReceiptItem[];
  userId: string;
  createdAt: Date | string;
}

export interface ISupplierInvoiceItem {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  quantityBilled: number;
  unitCostNet: number;
  subtotalNet: number;
}

export interface ISupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  status: SupplierInvoiceStatus;
  totalNet: number;
  ivaTotal: number;
  totalGross: number;
  observationReason?: string | null;
  authorizedByUserId?: string | null;
  authorizedAt?: Date | string | null;
  items?: ISupplierInvoiceItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISupplierCostAdjustment {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  previousCostNet: number;
  newCostNet: number;
  deltaCostUnit: number;
  stockQtyAdjusted: number;
  cogsQtyAdjusted: number;
  totalStockRevaluation: number;
  totalCogsAdjustment: number;
  appliedAt: Date | string;
}

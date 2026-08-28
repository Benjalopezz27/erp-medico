import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  AuditAction,
  ISupplierInvoiceDetail,
  SupplierInvoiceDecisionAction,
  SupplierInvoiceErrorCode,
  SupplierInvoiceStatus,
} from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { mapSupplierInvoiceDetail } from '../mappers/supplier-invoice.mapper';

@Injectable()
export class SupplierInvoiceDecisionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  authorize(id: string, userId: string): Promise<ISupplierInvoiceDetail> {
    return this.decide(
      id,
      userId,
      SupplierInvoiceDecisionAction.AUTHORIZE,
      null,
    );
  }

  reject(
    id: string,
    userId: string,
    reason: string,
  ): Promise<ISupplierInvoiceDetail> {
    const normalized = reason.trim();
    if (normalized.length < 3 || normalized.length > 500) {
      throw new BadRequestException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_REJECTION_REASON_INVALID,
        message: 'El motivo de rechazo debe contener entre 3 y 500 caracteres.',
      });
    }
    return this.decide(
      id,
      userId,
      SupplierInvoiceDecisionAction.REJECT,
      normalized,
    );
  }

  private async decide(
    id: string,
    userId: string,
    action: SupplierInvoiceDecisionAction,
    reason: string | null,
  ): Promise<ISupplierInvoiceDetail> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const invoice = await manager
          .createQueryBuilder(SupplierInvoice, 'invoice')
          .setLock('pessimistic_write')
          .where('invoice.id = :id', { id })
          .getOne();
        if (!invoice) {
          throw new NotFoundException({
            code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_NOT_FOUND,
            message: 'La factura de proveedor no existe.',
          });
        }

        if (invoice.decisionAction === action)
          return this.loadDetail(manager, id);
        if (
          invoice.decisionAction ||
          invoice.status !== SupplierInvoiceStatus.OBSERVADA
        ) {
          throw new ConflictException({
            code: invoice.decisionAction
              ? SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DECISION_CONFLICT
              : SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_STATUS,
            message: 'La factura ya no admite esta decisión.',
          });
        }

        const previousStatus = invoice.status;
        invoice.status =
          action === SupplierInvoiceDecisionAction.AUTHORIZE
            ? SupplierInvoiceStatus.AUTORIZADA
            : SupplierInvoiceStatus.RECHAZADA;
        invoice.decisionAction = action;
        invoice.decisionReason = reason;
        invoice.decisionUserId = userId;
        invoice.decidedAt = new Date();
        await manager.save(SupplierInvoice, invoice);

        const detail = await this.loadDetail(manager, id);
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityName: 'SupplierInvoice',
          entityId: id,
          previousValues: { status: previousStatus },
          newValues: {
            status: invoice.status,
            decisionAction: action,
            decisionReason: reason,
            costTolerancePercentageSnapshot:
              invoice.costTolerancePercentageSnapshot,
            observations: detail.items.map((item) => ({
              productId: item.productId,
              reasons: item.observationReasons,
              costDifferenceUnitNet: item.costDifferenceUnitNet,
              costVariationPercentage: item.costVariationPercentage,
            })),
          },
        });
        return detail;
      });
    } catch (error: any) {
      if (error?.code === '40P01' || error?.code === '40001') {
        throw new ConflictException({
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONCURRENCY_CONFLICT,
          message:
            'La factura fue decidida simultáneamente. Actualice el detalle.',
        });
      }
      throw error;
    }
  }

  private async loadDetail(
    manager: EntityManager,
    id: string,
  ): Promise<ISupplierInvoiceDetail> {
    const invoice = await manager.findOneOrFail(SupplierInvoice, {
      where: { id },
      relations: {
        supplier: true,
        goodsReceipt: true,
        purchaseOrder: true,
        user: true,
        decisionUser: true,
        confirmedBy: true,
        items: true,
        costAdjustments: true,
        priceReviews: true,
      },
    });
    return mapSupplierInvoiceDetail(invoice);
  }
}

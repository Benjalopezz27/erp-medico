import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductStatus, AuditAction } from '@erp/shared-types';
import { StockService } from './stock.service';
import { AuditService } from '../audit/audit.service';
import { Product } from '../products/entities/product.entity';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateStockAdjustmentDto, StockMovementResponseDto } from './dto';

@Injectable()
export class StockAdjustmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records a manual inventory adjustment (AJUSTE_ENTRADA, AJUSTE_SALIDA, MERMA)
   * and persists an atomic audit log entry within a single transactional boundary.
   */
  async createAdjustment(
    dto: CreateStockAdjustmentDto,
    actor: AuthenticatedUser,
  ): Promise<StockMovementResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Verify Product exists in database
      const product = await manager.findOneBy(Product, { id: dto.productId });
      if (!product) {
        throw new NotFoundException('El producto especificado no existe.');
      }

      // 2. Reject adjustments on inactive products
      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(
          'No se pueden registrar ajustes de stock en productos inactivos.',
        );
      }

      // 3. Delegate to StockService for locked balance mutation and ledger append
      const movement = await this.stockService.recordMovement(
        {
          productId: dto.productId,
          movementType: dto.movementType,
          quantityBase: dto.quantityBase,
          reason: dto.reason,
          documentReference: dto.documentReference,
          userId: actor.id,
        },
        manager,
      );

      // 4. Atomically persist audit log entry in the same transaction
      await this.auditService.record(manager, {
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityName: 'Stock',
        entityId: dto.productId,
        previousValues: {
          productId: dto.productId,
          currentBaseStock: movement.previousStock,
        },
        newValues: {
          productId: dto.productId,
          movementId: movement.id,
          movementType: movement.movementType,
          quantityBase: movement.quantityBase,
          previousStock: movement.previousStock,
          subsequentStock: movement.subsequentStock,
          reason: movement.reason,
          documentReference: movement.documentReference,
        },
      });

      return movement;
    });
  }
}

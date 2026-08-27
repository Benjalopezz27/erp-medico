import { StockMovementType } from '@erp/shared-types';
import {
  allocateFifoLayerTranche,
  FifoLedgerError,
  reconstructFifoLayers,
} from './fifo-cost-layer-engine';

const at = new Date('2026-08-27T12:00:00Z');
const movement = (
  id: string,
  movementType: StockMovementType,
  quantityBase: string,
  previousStock: string,
  subsequentStock: string,
  seconds: number,
) => ({
  id,
  movementType,
  quantityBase,
  previousStock,
  subsequentStock,
  createdAt: new Date(at.getTime() + seconds * 1000),
});

describe('FIFO cost layer engine', () => {
  it('attributes only the target receipt remainder after FIFO consumption', () => {
    const layers = reconstructFifoLayers(
      [
        movement(
          'a-prior',
          StockMovementType.AJUSTE_ENTRADA,
          '50',
          '0',
          '50',
          0,
        ),
        movement(
          'b-target',
          StockMovementType.ENTRADA_COMPRA,
          '100',
          '50',
          '150',
          1,
        ),
        movement(
          'c-sale',
          StockMovementType.SALIDA_VENTA,
          '80',
          '150',
          '70',
          2,
        ),
        movement(
          'd-later',
          StockMovementType.ENTRADA_COMPRA,
          '40',
          '70',
          '110',
          3,
        ),
      ],
      '110',
    );
    expect(
      layers.find((layer) => layer.movementId === 'a-prior')!.remainingQty,
    ).toBe('0.00');
    expect(
      layers.find((layer) => layer.movementId === 'b-target')!.remainingQty,
    ).toBe('70.00');
    expect(
      layers.find((layer) => layer.movementId === 'd-later')!.remainingQty,
    ).toBe('40.00');
  });

  it('splits sequential partial tranches without overlap', () => {
    const layer = {
      movementId: 'receipt',
      movementType: StockMovementType.ENTRADA_COMPRA,
      originalQty: '100.00',
      remainingQty: '70.00',
    } as const;
    expect(
      allocateFifoLayerTranche({ layer, startQty: '0', invoicedQty: '50' }),
    ).toEqual({
      layerStartQtyBase: '0.00',
      layerEndQtyBase: '50.00',
      onHandAllocatedQty: '20.00',
      consumedAllocatedQty: '30.00',
    });
    expect(
      allocateFifoLayerTranche({ layer, startQty: '50', invoicedQty: '50' }),
    ).toEqual({
      layerStartQtyBase: '50.00',
      layerEndQtyBase: '100.00',
      onHandAllocatedQty: '50.00',
      consumedAllocatedQty: '0.00',
    });
  });

  it('supports a positive opening balance and stable tie ordering', () => {
    const layers = reconstructFifoLayers(
      [
        movement('b-out', StockMovementType.SALIDA_VENTA, '5', '30', '25', 0),
        movement('a-in', StockMovementType.AJUSTE_ENTRADA, '10', '20', '30', 0),
      ],
      '25',
    );
    expect(layers[0]).toMatchObject({
      movementId: 'OPENING_BALANCE',
      originalQty: '20.00',
      remainingQty: '15.00',
    });
  });

  it('rejects discontinuous or non-reconciling ledgers', () => {
    expect(() =>
      reconstructFifoLayers(
        [
          movement(
            'entry',
            StockMovementType.ENTRADA_COMPRA,
            '100',
            '0',
            '100',
            0,
          ),
          movement('sale', StockMovementType.SALIDA_VENTA, '10', '90', '80', 1),
        ],
        '80',
      ),
    ).toThrow(FifoLedgerError);
    expect(() =>
      reconstructFifoLayers(
        [
          movement(
            'entry',
            StockMovementType.ENTRADA_COMPRA,
            '100',
            '0',
            '100',
            0,
          ),
        ],
        '99',
      ),
    ).toThrow('no coincide con el stock materializado');
  });
});

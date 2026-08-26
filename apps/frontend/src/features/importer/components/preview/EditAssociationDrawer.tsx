import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Loader2, Package, X } from 'lucide-react';
import { useUnitsQuery } from '../../../units/hooks/use-units-query';
import { useUpdateSupplierProductMutation } from '../../../supplier-products/hooks/use-supplier-product-mutations';
import { parseSupplierProductApiError } from '../../../supplier-products/utils/supplier-products.errors';
import type { IImporterErrorRow } from '../../types/importer.types';

interface EditAssociationDrawerProps {
  isOpen: boolean;
  supplierId: string;
  supplierName: string;
  row: IImporterErrorRow | null;
  onClose: () => void;
  onUpdated: (sku: string) => Promise<void> | void;
}

const POSITIVE_DECIMAL_4 = /^\d+(?:\.\d{1,4})?$/;

export const EditAssociationDrawer: React.FC<EditAssociationDrawerProps> = ({
  isOpen,
  supplierId,
  supplierName,
  row,
  onClose,
  onUpdated,
}) => {
  const associationId = row?.association?.id ?? '';
  const { data: units = [], isLoading: isLoadingUnits } = useUnitsQuery();
  const updateMutation = useUpdateSupplierProductMutation(supplierId, associationId);
  const [purchaseUnitId, setPurchaseUnitId] = useState('');
  const [conversionFactor, setConversionFactor] = useState('1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && row?.association) {
      setPurchaseUnitId(row.association.purchaseUnit.id);
      setConversionFactor(row.association.conversionFactorToBase);
      setErrorMessage(null);
    }
  }, [isOpen, row]);

  const isBaseUnit = purchaseUnitId === row?.association?.product.baseUnit.id;
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === purchaseUnitId),
    [purchaseUnitId, units],
  );

  const handleUnitChange = (unitId: string) => {
    setPurchaseUnitId(unitId);
    setErrorMessage(null);
    if (unitId === row?.association?.product.baseUnit.id) {
      setConversionFactor('1');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!row?.association || !purchaseUnitId) {
      setErrorMessage('Debe seleccionar una unidad de compra.');
      return;
    }

    const normalizedFactor = conversionFactor.trim().replace(',', '.');
    const factor = Number(normalizedFactor);
    if (!POSITIVE_DECIMAL_4.test(normalizedFactor) || !Number.isFinite(factor) || factor <= 0) {
      setErrorMessage('El factor debe ser mayor a 0 y tener como máximo 4 decimales.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        purchaseUnitId,
        conversionFactorToBase: factor,
      });
      onClose();
      await onUpdated(row.rawSku ?? row.association.supplierExternalCode);
    } catch (error) {
      setErrorMessage(parseSupplierProductApiError(error).message);
    }
  };

  if (!isOpen || !row?.association) return null;

  const { association } = row;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-slate-900/60 backdrop-blur-sm">
      <div
        className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-association-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="edit-association-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                Corregir asociación
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proveedor: <span className="font-semibold">{supplierName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Dato recibido en la fila {row.rowNumber}
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                SKU <span className="font-mono font-bold">{row.rawSku}</span> · Unidad informada:{' '}
                <span className="font-semibold">{row.rawPurchaseUnit || '[Vacía]'}</span>
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {association.product.internalCode} · {association.product.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Producto asociado (no se modifica) · Unidad base:{' '}
                    <strong>
                      {association.product.baseUnit.name} ({association.product.baseUnit.symbol})
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="association-purchase-unit"
                  className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Unidad de compra
                </label>
                <select
                  id="association-purchase-unit"
                  value={purchaseUnitId}
                  onChange={(event) => handleUnitChange(event.target.value)}
                  disabled={isLoadingUnits || updateMutation.isPending}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                >
                  <option value="">Seleccionar unidad...</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="association-conversion-factor"
                  className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  Factor de conversión a unidad base
                </label>
                <input
                  id="association-conversion-factor"
                  type="text"
                  inputMode="decimal"
                  value={conversionFactor}
                  onChange={(event) => setConversionFactor(event.target.value)}
                  disabled={isBaseUnit || updateMutation.isPending}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-900"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  1 {selectedUnit?.symbol || 'unidad de compra'} equivale a{' '}
                  {conversionFactor || '—'} {association.product.baseUnit.symbol}.
                  {isBaseUnit && ' Al coincidir con la unidad base, el factor queda fijado en 1.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 p-6 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !purchaseUnitId}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar y volver a validar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Link as LinkIcon,
  Loader2,
  Package,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { ProductSearchInput } from '../../../products/components/ProductSearchInput';
import { useUnitsQuery } from '../../../units/hooks/use-units-query';
import { useResolveUnknownSkuMutation } from '../../hooks/use-resolve-unknown-sku';
import { parseImporterApiError } from '../../utils/importer.errors';
import type { IImporterUnknownRow } from '../../types/importer.types';
import type { IProductSummary } from '../../../products/types/products.types';

interface ResolveUnknownDrawerProps {
  isOpen: boolean;
  supplierId: string;
  supplierName: string;
  row: IImporterUnknownRow | null;
  onClose: () => void;
  onResolved: (sku: string) => void;
}

export const ResolveUnknownDrawer: React.FC<ResolveUnknownDrawerProps> = ({
  isOpen,
  supplierId,
  supplierName,
  row,
  onClose,
  onResolved,
}) => {
  const { data: units = [], isLoading: isLoadingUnits } = useUnitsQuery();
  const resolveMutation = useResolveUnknownSkuMutation();

  const [selectedProduct, setSelectedProduct] = useState<IProductSummary | null>(null);
  const [purchaseUnitId, setPurchaseUnitId] = useState<string>('');
  const [conversionFactor, setConversionFactor] = useState<string>('1');
  const [supplierDescription, setSupplierDescription] = useState<string>('');
  const [usualCostNet, setUsualCostNet] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset state when row changes or drawer opens
  useEffect(() => {
    if (row && isOpen) {
      setSelectedProduct(null);
      setSupplierDescription(row.supplierDescription || '');
      setUsualCostNet(row.usualCostNet || '');
      setPurchaseUnitId('');
      setConversionFactor('1');
      setErrorMsg(null);
    }
  }, [row, isOpen]);

  // When product is selected, default purchase unit to baseUnit
  const handleProductSelect = (product: IProductSummary | null) => {
    setSelectedProduct(product);
    setErrorMsg(null);
    if (product) {
      setPurchaseUnitId(product.baseUnit.id);
      setConversionFactor('1');
    } else {
      setPurchaseUnitId('');
      setConversionFactor('1');
    }
  };

  // When purchase unit changes
  const handlePurchaseUnitChange = (unitId: string) => {
    setPurchaseUnitId(unitId);
    setErrorMsg(null);
    if (selectedProduct && unitId === selectedProduct.baseUnit.id) {
      setConversionFactor('1');
    }
  };

  const isSameUnit = selectedProduct && purchaseUnitId === selectedProduct.baseUnit.id;

  const selectedPurchaseUnit = units.find((u) => u.id === purchaseUnitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !selectedProduct || !purchaseUnitId) {
      setErrorMsg('Debe seleccionar un producto del catálogo y una unidad de compra.');
      return;
    }

    const factorNum = Number(conversionFactor);
    if (!Number.isFinite(factorNum) || factorNum <= 0) {
      setErrorMsg('El factor de conversión debe ser un número estrictamente mayor a 0.');
      return;
    }

    const costNum = Number(usualCostNet);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setErrorMsg('El costo habitual debe ser un número válido mayor o igual a 0.');
      return;
    }

    try {
      await resolveMutation.mutateAsync({
        supplierId,
        supplierSku: row.rawSku,
        productId: selectedProduct.id,
        purchaseUnitId,
        conversionFactorToBase: factorNum,
        supplierDescription: supplierDescription.trim() || undefined,
        usualCostNet: costNum,
      });

      onResolved(row.rawSku);
      onClose();
    } catch (err: any) {
      const parsed = parseImporterApiError(err);
      setErrorMsg(parsed || 'Error al asociar el SKU.');
    }
  };

  if (!isOpen || !row) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl h-full flex flex-col justify-between border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Asociar SKU Desconocido
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proveedor: <span className="font-semibold">{supplierName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Context box: Data from file */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Datos del Archivo (Fila {row.rowNumber})
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">SKU Proveedor:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {row.rawSku}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Costo Neto en Archivo:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  $
                  {Number(row.usualCostNet).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>
              {row.supplierDescription && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 block">Descripción en Archivo:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-xs">
                    {row.supplierDescription}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Product Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              1. Seleccionar Producto del Catálogo <span className="text-rose-500">*</span>
            </label>
            <ProductSearchInput
              value={selectedProduct}
              onSelect={handleProductSelect}
              placeholder="Buscar por código (ej: P0001) o nombre..."
            />
            {selectedProduct && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-100">
                      {selectedProduct.name}
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 block">
                      Código: {selectedProduct.internalCode}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-500 uppercase font-semibold block">
                    Unidad Base
                  </span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">
                    {selectedProduct.baseUnit.name} ({selectedProduct.baseUnit.symbol})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Purchase Unit & Conversion Factor */}
          {selectedProduct && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                2. Unidad de Compra y Equivalencia <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Purchase Unit */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Unidad de Compra
                  </label>
                  <select
                    value={purchaseUnitId}
                    onChange={(e) => handlePurchaseUnitChange(e.target.value)}
                    disabled={isLoadingUnits}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Seleccionar unidad...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conversion Factor */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Factor de Conversión a Base
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={conversionFactor}
                    onChange={(e) => setConversionFactor(e.target.value)}
                    disabled={Boolean(isSameUnit)}
                    placeholder="1"
                    className={`w-full px-3 py-2 text-sm rounded-lg border font-mono ${
                      isSameUnit
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                    }`}
                  />
                </div>
              </div>

              {/* Dynamic Equivalence Helper */}
              {selectedPurchaseUnit && selectedProduct && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Equivalencia: 1{' '}
                    <span className="font-semibold">{selectedPurchaseUnit.name}</span> ={' '}
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {conversionFactor || '1'}
                    </span>{' '}
                    <span className="font-semibold">{selectedProduct.baseUnit.name}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Optional Details */}
          {selectedProduct && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                3. Datos Opcionales de Catálogo
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Descripción del Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={supplierDescription}
                  onChange={(e) => setSupplierDescription(e.target.value)}
                  placeholder="Ej: Paracetamol 500mg x 50 comp"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Costo Habitual del Proveedor ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={usualCostNet}
                  onChange={(e) => setUsualCostNet(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Se guardará como costo habitual del proveedor. No modifica el costo base del
                  producto.
                </span>
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={resolveMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedProduct || !purchaseUnitId || resolveMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {resolveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Asociando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Asociación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

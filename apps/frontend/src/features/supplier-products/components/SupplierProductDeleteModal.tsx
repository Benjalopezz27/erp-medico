import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ISupplierProduct } from '../types/supplier-products.types';

interface SupplierProductDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierProduct: ISupplierProduct | null;
  onConfirm: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const SupplierProductDeleteModal: React.FC<SupplierProductDeleteModalProps> = ({
  isOpen,
  onClose,
  supplierProduct,
  onConfirm,
  isLoading,
  errorMessage,
}) => {
  if (!supplierProduct) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Asociación de Catálogo">
      <div className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">¿Estás seguro de eliminar esta asociación?</p>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              Esta acción eliminará el mapeo entre el producto interno y el código externo del
              proveedor. El producto interno y su stock no sufrirán ninguna modificación.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Producto interno:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {supplierProduct.product?.internalCode} - {supplierProduct.product?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">SKU Proveedor:</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {supplierProduct.supplierExternalCode}
            </span>
          </div>
          {supplierProduct.supplierDescription && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Descripción externa:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {supplierProduct.supplierDescription}
              </span>
            </div>
          )}
          {supplierProduct.isPrimarySupplier && (
            <div className="pt-1 text-amber-600 dark:text-amber-400 font-medium">
              Nota: Este proveedor estaba marcado como habitual. Al eliminarlo, el producto quedará
              sin proveedor habitual.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Eliminación
          </Button>
        </div>
      </div>
    </Modal>
  );
};

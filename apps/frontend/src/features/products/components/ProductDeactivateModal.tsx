import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { parseProductApiError } from '../utils/products.errors';
import type { ProductListItem } from '../types/products.types';

interface ProductDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductListItem | null;
  onConfirm: (product: ProductListItem) => Promise<void>;
  onSuccessNotice?: (message: string) => void;
}

export const ProductDeactivateModal: React.FC<ProductDeactivateModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirm,
  onSuccessNotice,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setErrorMessage(null);
  }, [isOpen, product?.id]);

  if (!product) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm(product);
      onSuccessNotice?.(
        `El producto "${product.name}" (${product.internalCode}) fue desactivado exitosamente.`,
      );
      onClose();
    } catch (err) {
      setErrorMessage(parseProductApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Desactivar Producto"
      className="max-w-md"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-full shrink-0 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600 space-y-1.5">
            <p>
              ¿Estás seguro de que deseas desactivar el producto{' '}
              <strong className="text-slate-900 font-semibold">{product.name}</strong> (
              <span className="font-mono">{product.internalCode}</span>)?
            </p>
            <p className="text-slate-500">
              El producto no estará disponible para nuevas ventas u operaciones, pero se conservará
              su historial y podrás reactivarlo en cualquier momento.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs text-slate-600"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Desactivar Producto</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

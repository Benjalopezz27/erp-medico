import React, { useState } from 'react';
import { ShieldAlert, Loader2, AlertCircle, Search, Check } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useProductSearchQuery } from '@/features/products/hooks/use-product-search-query';
import { useCreateQuarantineMutation } from '../../hooks/use-quarantine';
import { parseQuarantineApiError } from '../../utils/quarantine.errors';
import type { IProductSummary } from '@/features/products/types/products.types';

interface QuarantineCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuarantineCreateModal: React.FC<QuarantineCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<IProductSummary | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: searchResults = [], isLoading: isSearching } = useProductSearchQuery(searchTerm, {
    enabled: !selectedProduct && searchTerm.trim().length >= 2,
  });

  const { mutate: executeCreate, isPending } = useCreateQuarantineMutation();

  const handleClose = () => {
    if (isPending) return;
    setSearchTerm('');
    setSelectedProduct(null);
    setQuantity('');
    setReason('');
    setFormError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProduct) {
      setFormError('Debes seleccionar un producto del catálogo.');
      return;
    }

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setFormError('Ingresa una cantidad válida mayor a 0.');
      return;
    }

    const decimalParts = quantity.split('.');
    if (decimalParts[1] && decimalParts[1].length > 2) {
      setFormError('La cantidad no puede tener más de 2 decimales.');
      return;
    }

    if (!reason.trim()) {
      setFormError('El motivo de ingreso a cuarentena es obligatorio.');
      return;
    }

    executeCreate(
      {
        productId: selectedProduct.id,
        quantityBase: numQty,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setFormError(parseQuarantineApiError(err));
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ingresar Mercadería a Cuarentena"
      description="Aparta stock disponible del catálogo para revisión, devolución o merma."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="quarantine-create-form">
        {/* Error Banner */}
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Product Search or Selected Product */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Producto <span className="text-destructive">*</span>
          </label>

          {selectedProduct ? (
            <div className="flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg">
              <div>
                <p className="font-semibold text-sm text-foreground">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedProduct.internalCode} • Unidad: {selectedProduct.baseUnit?.name} (
                  {selectedProduct.baseUnit?.symbol})
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setSelectedProduct(null);
                  setSearchTerm('');
                }}
                className="text-xs text-primary hover:text-primary/80 h-7 px-2"
              >
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                data-testid="quarantine-product-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe al menos 2 letras del nombre o código..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Typeahead Suggestions */}
              {searchResults.length > 0 && !selectedProduct && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg divide-y divide-border">
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(prod);
                        setSearchTerm('');
                      }}
                      className="w-full text-left p-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between text-xs"
                      data-testid={`quarantine-product-option-${prod.id}`}
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{prod.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {prod.internalCode} • {prod.baseUnit?.name} ({prod.baseUnit?.symbol})
                        </span>
                      </div>
                      <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity to Quarantine */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Cantidad a Apartar <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.01"
              data-testid="quarantine-quantity-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              disabled={isPending}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedProduct && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                {selectedProduct.baseUnit?.symbol}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Se descontará inmediatamente del saldo de stock disponible mediante movimiento
            AJUSTE_SALIDA.
          </p>
        </div>

        {/* Reason Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Motivo de Ingreso <span className="text-destructive">*</span>
          </label>
          <textarea
            data-testid="quarantine-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            placeholder="Ej: Cajas con roturas detectadas en recepción, lote a verificar por calidad..."
            disabled={isPending}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Explica la causa del aislamiento del stock.</span>
            <span>{reason.length}/255</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={isPending}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="quarantine-submit-btn"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                Apartar a Cuarentena
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

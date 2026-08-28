import { useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { CustomerPricingRuleApplied, type ICustomerSpecialPrice } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/features/products/utils/products.math';
import { useDeleteCustomerSpecialPriceMutation } from '../hooks/use-customer-pricing-mutations';
import { parseCustomerPricingError } from '../utils/customer-pricing.errors';

const fallbackLabel = {
  [CustomerPricingRuleApplied.GENERAL_DISCOUNT]: 'descuento general',
  [CustomerPricingRuleApplied.CATALOG_PRICE]: 'precio de catálogo',
  [CustomerPricingRuleApplied.FIXED_PRICE]: 'precio fijo',
  [CustomerPricingRuleApplied.PRODUCT_DISCOUNT]: 'descuento por producto',
};

export function CustomerSpecialPriceDeleteModal({
  customerId,
  rule,
  generalDiscountPercentage,
  onClose,
  onSuccess,
  onRefresh,
}: {
  customerId: string;
  rule: ICustomerSpecialPrice | null;
  generalDiscountPercentage: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRefresh: () => void;
}) {
  const mutation = useDeleteCustomerSpecialPriceMutation(customerId);
  const [error, setError] = useState<string>();
  if (!rule) return null;
  const close = () => !mutation.isPending && onClose();
  const confirm = async () => {
    if (mutation.isPending) return;
    setError(undefined);
    try {
      const result = await mutation.mutateAsync({ id: rule.id, productId: rule.productId });
      const message = result.fallback
        ? `Excepción eliminada. Ahora aplica ${fallbackLabel[result.fallback.ruleApplied]}: ${formatCurrency(result.fallback.finalPriceNet)}.`
        : 'Excepción eliminada. Actualizá la vista para consultar el fallback vigente.';
      onSuccess(message);
      onClose();
    } catch (cause) {
      setError(parseCustomerPricingError(cause).message);
    }
  };
  return (
    <Modal
      isOpen
      onClose={close}
      showCloseButton={!mutation.isPending}
      title="Eliminar excepción"
      description="El catálogo global no será modificado"
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            Al eliminar la excepción de <strong>{rule.productName}</strong>, aplicará{' '}
            {Number(generalDiscountPercentage) > 0
              ? `el descuento general de ${generalDiscountPercentage}%`
              : 'el precio activo de catálogo'}
            . El resultado exacto se consultará al backend después de eliminar.
          </p>
        </div>
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {error}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 block"
              onClick={onRefresh}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Actualizar
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={close}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => void confirm()}
          >
            {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Eliminar
            excepción
          </Button>
        </div>
      </div>
    </Modal>
  );
}

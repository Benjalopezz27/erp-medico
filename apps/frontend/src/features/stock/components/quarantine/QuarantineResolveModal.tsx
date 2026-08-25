import React, { useState } from 'react';
import { CheckSquare, Loader2, AlertCircle, RotateCcw, Trash2, Undo2, Info } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useResolveQuarantineMutation } from '../../hooks/use-quarantine';
import { parseQuarantineApiError } from '../../utils/quarantine.errors';
import { QuarantineResolution, type IQuarantineStock } from '../../types/quarantine.types';

interface QuarantineResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: IQuarantineStock | null;
}

export const QuarantineResolveModal: React.FC<QuarantineResolveModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [resolution, setResolution] = useState<QuarantineResolution>(
    QuarantineResolution.REINGRESO,
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: executeResolve, isPending } = useResolveQuarantineMutation();

  if (!item) return null;

  const handleClose = () => {
    if (isPending) return;
    setNotes('');
    setFormError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!notes.trim() || notes.trim().length < 3) {
      setFormError('Las notas de resolución son obligatorias (mínimo 3 caracteres).');
      return;
    }

    executeResolve(
      {
        id: item.id,
        payload: {
          resolution,
          resolutionNotes: notes.trim(),
        },
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
      title="Resolver Mercadería en Cuarentena"
      description="Selecciona el destino definitivo del lote retenido."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="quarantine-resolve-form">
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

        {/* Item Summary Card */}
        <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1.5 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-foreground text-sm">{item.product.name}</p>
              <p className="font-mono text-muted-foreground text-[11px]">
                {item.product.internalCode} • Unidad: {item.product.baseUnit.name} (
                {item.product.baseUnit.symbol})
              </p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[11px]">Cantidad Retenida</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {item.quantityBase.toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {item.product.baseUnit.symbol}
              </span>
            </div>
          </div>
          <div className="pt-1 text-muted-foreground">
            <span className="font-medium text-foreground">Motivo Ingreso:</span> {item.reason}
          </div>
        </div>

        {/* Resolution Options */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Tipo de Resolución <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Reingreso */}
            <button
              type="button"
              onClick={() => setResolution(QuarantineResolution.REINGRESO)}
              className={`p-3 rounded-lg border text-left flex flex-col items-center justify-center text-center transition-all ${
                resolution === QuarantineResolution.REINGRESO
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
              }`}
              data-testid="quarantine-option-reingreso"
            >
              <RotateCcw className="w-5 h-5 mb-1.5 text-emerald-600" />
              <span className="font-semibold text-xs text-foreground">Reingreso</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Retorna al stock</span>
            </button>

            {/* Merma */}
            <button
              type="button"
              onClick={() => setResolution(QuarantineResolution.MERMA)}
              className={`p-3 rounded-lg border text-left flex flex-col items-center justify-center text-center transition-all ${
                resolution === QuarantineResolution.MERMA
                  ? 'border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20'
                  : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
              }`}
              data-testid="quarantine-option-merma"
            >
              <Trash2 className="w-5 h-5 mb-1.5 text-destructive" />
              <span className="font-semibold text-xs text-foreground">Merma</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Destrucción / Pérdida
              </span>
            </button>

            {/* Devolución */}
            <button
              type="button"
              onClick={() => setResolution(QuarantineResolution.DEVOLUCION_PROVEEDOR)}
              className={`p-3 rounded-lg border text-left flex flex-col items-center justify-center text-center transition-all ${
                resolution === QuarantineResolution.DEVOLUCION_PROVEEDOR
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20'
                  : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
              }`}
              data-testid="quarantine-option-devolucion"
            >
              <Undo2 className="w-5 h-5 mb-1.5 text-purple-600" />
              <span className="font-semibold text-xs text-foreground">Devolución</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Al Proveedor</span>
            </button>
          </div>
        </div>

        {/* Dynamic Ledger Impact Hint */}
        <div className="p-3 rounded-lg text-xs leading-relaxed border flex items-start gap-2 bg-muted/30 border-border">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            {resolution === QuarantineResolution.REINGRESO && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Impacto en Stock:</strong> Se registrará un
                movimiento <strong className="font-mono text-emerald-600">AJUSTE_ENTRADA</strong> de{' '}
                <strong className="text-foreground">
                  {item.quantityBase} {item.product.baseUnit.symbol}
                </strong>
                , reincorporando las unidades al stock disponible para ventas.
              </p>
            )}
            {resolution === QuarantineResolution.MERMA && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Impacto en Stock:</strong> Se confirmará la baja
                definitiva por merma.{' '}
                <strong className="text-foreground">No se generarán movimientos adicionales</strong>{' '}
                ya que el saldo fue descontado al apartar a cuarentena.
              </p>
            )}
            {resolution === QuarantineResolution.DEVOLUCION_PROVEEDOR && (
              <p className="text-muted-foreground">
                <strong className="text-foreground">Impacto en Stock:</strong> Se confirmará la
                devolución física al proveedor.{' '}
                <strong className="text-foreground">
                  No se generarán movimientos adicionales de saldo
                </strong>
                .
              </p>
            )}
          </div>
        </div>

        {/* Resolution Notes Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Notas de Resolución <span className="text-destructive">*</span>
          </label>
          <textarea
            data-testid="quarantine-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Detalla las conclusiones de la inspección, acta de destrucción o número de remito de devolución..."
            disabled={isPending}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Mínimo 3 caracteres.</span>
            <span>{notes.length}/1000</span>
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
            className="text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="quarantine-confirm-resolve-btn"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aplicando Resolución...
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                Confirmar Resolución
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

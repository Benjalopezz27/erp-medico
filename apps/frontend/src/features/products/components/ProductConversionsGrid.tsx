import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { IUnit } from '../types/products.types';

export interface ConversionRowItem {
  id?: string;
  presentationUnitId: string;
  conversionFactor: number | string;
}

interface ProductConversionsGridProps {
  conversions: ConversionRowItem[];
  availableUnits: IUnit[];
  baseUnitId: string;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (
    index: number,
    field: 'presentationUnitId' | 'conversionFactor',
    value: string | number,
  ) => void;
  errors?: Record<string, any>;
  disabled?: boolean;
}

export const ProductConversionsGrid: React.FC<ProductConversionsGridProps> = ({
  conversions,
  availableUnits,
  baseUnitId,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  errors,
  disabled = false,
}) => {
  const baseUnit = availableUnits.find((u) => u.id === baseUnitId);

  // Collect units selected in other rows
  const selectedPresentationUnitIds = conversions.map((c) => c.presentationUnitId).filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Conversiones de Unidades
          </h4>
          <p className="text-[11px] text-slate-500">
            Define equivalencias entre unidades de presentación y la unidad base del producto.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddRow}
          disabled={disabled || !baseUnitId}
          className="text-xs gap-1.5 border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Conversión</span>
        </Button>
      </div>

      {!baseUnitId && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          Selecciona una <strong>Unidad Base</strong> arriba para habilitar la configuración de
          conversiones.
        </div>
      )}

      {baseUnitId && conversions.length === 0 && (
        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
          No hay conversiones adicionales configuradas. El producto se comercializará únicamente en
          su unidad base ({baseUnit?.name || 'Unidad'}).
        </div>
      )}

      {baseUnitId && conversions.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-1/3">Unidad de Presentación *</th>
                <th className="py-2.5 px-3 w-1/4">Factor de Conversión *</th>
                <th className="py-2.5 px-3">Equivalencia</th>
                <th className="py-2.5 px-3 text-center w-16">Quitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {conversions.map((row, index) => {
                const presentationUnit = availableUnits.find(
                  (u) => u.id === row.presentationUnitId,
                );

                const factorNum = Number(row.conversionFactor);
                const isValidFactor = !isNaN(factorNum) && factorNum > 0;

                const equivalenceText =
                  presentationUnit && baseUnit && isValidFactor
                    ? `1 ${presentationUnit.name} = ${factorNum} ${baseUnit.name}`
                    : '—';

                const rowError = errors?.conversions?.[index];

                return (
                  <tr key={index} className="hover:bg-slate-50/50">
                    {/* Presentation Unit Selector */}
                    <td className="py-2 px-3 align-top">
                      <Select
                        value={row.presentationUnitId || ''}
                        onChange={(e) => onUpdateRow(index, 'presentationUnitId', e.target.value)}
                        disabled={disabled}
                        aria-label={`Unidad de presentación fila ${index + 1}`}
                        className="text-xs h-8"
                      >
                        <option value="">Seleccionar unidad...</option>
                        {availableUnits.map((unit) => {
                          const isBase = unit.id === baseUnitId;
                          const isAlreadySelected =
                            selectedPresentationUnitIds.includes(unit.id) &&
                            row.presentationUnitId !== unit.id;

                          return (
                            <option
                              key={unit.id}
                              value={unit.id}
                              disabled={isBase || isAlreadySelected}
                            >
                              {unit.name} ({unit.symbol})
                              {isBase
                                ? ' (Unidad base actual)'
                                : isAlreadySelected
                                  ? ' (Ya seleccionada)'
                                  : ''}
                            </option>
                          );
                        })}
                      </Select>
                      {rowError?.presentationUnitId && (
                        <p className="text-[10px] text-red-600 mt-1">
                          {rowError.presentationUnitId.message}
                        </p>
                      )}
                    </td>

                    {/* Conversion Factor Input */}
                    <td className="py-2 px-3 align-top">
                      <Input
                        type="number"
                        step="any"
                        min="0.0001"
                        max="999999.9999"
                        value={row.conversionFactor ?? ''}
                        onChange={(e) => onUpdateRow(index, 'conversionFactor', e.target.value)}
                        disabled={disabled}
                        placeholder="Ej: 100"
                        aria-label={`Factor de conversión fila ${index + 1}`}
                        className="text-xs h-8"
                      />
                      {rowError?.conversionFactor && (
                        <p className="text-[10px] text-red-600 mt-1">
                          {rowError.conversionFactor.message}
                        </p>
                      )}
                    </td>

                    {/* Dynamic Equivalence Text */}
                    <td className="py-2 px-3 align-middle text-slate-700 font-medium">
                      <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] inline-block">
                        {equivalenceText}
                      </span>
                    </td>

                    {/* Remove Action Button */}
                    <td className="py-2 px-3 text-center align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveRow(index)}
                        disabled={disabled}
                        aria-label={`Eliminar conversión fila ${index + 1}`}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

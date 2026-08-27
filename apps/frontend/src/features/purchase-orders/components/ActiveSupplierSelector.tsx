import React, { useState, useEffect, useRef, useId } from 'react';
import { X, Loader2, Factory, AlertCircle } from 'lucide-react';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';

import type { ISupplier } from '@/features/suppliers/types/suppliers.types';
import { cn } from '@/lib/utils';

export interface ActiveSupplierSelectorProps {
  value?: string;
  onChange: (supplierId: string, supplier: ISupplier) => void;
  currentSupplier?: {
    id: string;
    businessName: string;
    cuit: string;
    isActive: boolean;
  } | null;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
  className?: string;
}

export const ActiveSupplierSelector: React.FC<ActiveSupplierSelectorProps> = ({
  value,
  onChange,
  currentSupplier,
  disabled = false,
  error,
  ariaLabel = 'Seleccionar proveedor',
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedSupplier, setSelectedSupplier] = useState<{
    id: string;
    businessName: string;
    cuit: string;
    isActive?: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Synchronize selection with external props
  useEffect(() => {
    if (value && currentSupplier && currentSupplier.id === value) {
      setSelectedSupplier(currentSupplier);
      setSearchTerm(`${currentSupplier.businessName} (${currentSupplier.cuit})`);
    } else if (!value) {
      setSelectedSupplier(null);
      setSearchTerm('');
    }
  }, [value, currentSupplier]);

  // Debounce search input
  useEffect(() => {
    if (
      selectedSupplier &&
      searchTerm === `${selectedSupplier.businessName} (${selectedSupplier.cuit})`
    ) {
      setDebouncedTerm('');
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedSupplier]);

  // Query ONLY active suppliers
  const {
    data: suppliersResponse,
    isLoading,
    isFetching,
    isError,
  } = useSuppliersQuery({
    isActive: true,
    limit: 50,
    search: debouncedTerm.trim() || undefined,
  });

  const suppliers = suppliersResponse?.data || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setSearchTerm(nextVal);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (supplier: ISupplier) => {
    setSelectedSupplier(supplier);
    setSearchTerm(`${supplier.businessName} (${supplier.cuit})`);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(supplier.id, supplier);
  };

  const handleClear = () => {
    setSearchTerm('');
    setDebouncedTerm('');
    setSelectedSupplier(null);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suppliers.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suppliers.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suppliers.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suppliers.length) {
          handleSelect(suppliers[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const isInactiveSelected = selectedSupplier && selectedSupplier.isActive === false;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Factory className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Buscar proveedor activo por razón social o CUIT..."
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 && suppliers[activeIndex]
              ? `supplier-opt-${suppliers[activeIndex].id}`
              : undefined
          }
          className={cn(
            'w-full h-9 pl-9 pr-14 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder:text-slate-400',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-slate-300 dark:border-slate-700',
          )}
        />

        {/* Inactive Badge for legacy draft suppliers */}
        {isInactiveSelected && (
          <span className="absolute right-8 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
            Inactivo
          </span>
        )}

        {/* Clear & Loading Icons */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {(isLoading || isFetching) && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          )}

          {searchTerm.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar proveedor"
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-[11px] text-red-600 font-medium">{error}</p>}

      {/* Combobox Dropdown */}
      {isOpen && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-xs divide-y divide-slate-50 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          {isLoading && suppliers.length === 0 && (
            <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Buscando proveedores activos...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Error al buscar proveedores.</span>
            </div>
          )}

          {!isLoading && !isError && suppliers.length === 0 && (
            <div className="p-4 text-center text-slate-500 space-y-1">
              <Factory className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="font-medium text-slate-800 dark:text-slate-200">
                No se encontraron proveedores activos
              </p>
              {debouncedTerm && (
                <p className="text-[11px] text-slate-400">
                  Sin coincidencias para "{debouncedTerm}"
                </p>
              )}
            </div>
          )}

          {!isLoading &&
            !isError &&
            suppliers.map((sup, index) => {
              const isSelected = activeIndex === index || value === sup.id;

              return (
                <div
                  key={sup.id}
                  id={`supplier-opt-${sup.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(sup)}
                  className={cn(
                    'p-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors',
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300',
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {sup.businessName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      CUIT: {sup.cuit} • {sup.taxCondition}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

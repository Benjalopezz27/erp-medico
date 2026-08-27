import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, X, Loader2, Package, AlertCircle } from 'lucide-react';
import { useSupplierProductsInfiniteQuery } from '../hooks/use-purchase-orders-query';
import { formatCurrency } from '../utils/purchase-orders.math';
import type { ISupplierProduct } from '@/features/supplier-products/types/supplier-products.types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SupplierProductSearchInputProps {
  supplierId: string;
  onSelect: (supplierProduct: ISupplierProduct) => void;
  disabledSupplierProductIds?: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export const SupplierProductSearchInput: React.FC<SupplierProductSearchInputProps> = ({
  supplierId,
  onSelect,
  disabledSupplierProductIds = [],
  disabled = false,
  placeholder = 'Buscar en catálogo del proveedor por código o nombre...',
  className = '',
  ariaLabel = 'Buscar producto en catálogo',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Reset when supplier changes
  useEffect(() => {
    setSearchTerm('');
    setDebouncedTerm('');
    setIsOpen(false);
    setActiveIndex(-1);
  }, [supplierId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, isError } =
    useSupplierProductsInfiniteQuery(supplierId, isOpen ? debouncedTerm : undefined);

  const flatResults: ISupplierProduct[] = data?.pages.flatMap((page) => page.data) || [];

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
    setSearchTerm(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelectProduct = (product: ISupplierProduct) => {
    if (disabledSupplierProductIds.includes(product.id)) return;
    onSelect(product);
    setSearchTerm('');
    setDebouncedTerm('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || flatResults.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          handleSelectProduct(flatResults[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const isInputDisabled = disabled || !supplierId;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (supplierId) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
          placeholder={!supplierId ? 'Seleccione un proveedor primero...' : placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 && flatResults[activeIndex]
              ? `catalog-opt-${flatResults[activeIndex].id}`
              : undefined
          }
          className="w-full h-9 pl-9 pr-8 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder:text-slate-400"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {(isLoading || isFetching || isFetchingNextPage) && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          )}

          {searchTerm.length > 0 && !isInputDisabled && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedTerm('');
                setIsOpen(false);
                setActiveIndex(-1);
              }}
              aria-label="Limpiar búsqueda"
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && !isInputDisabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-72 overflow-y-auto py-1 text-xs divide-y divide-slate-50 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          {isLoading && flatResults.length === 0 && (
            <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Buscando en catálogo del proveedor...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Error al buscar productos del proveedor.</span>
            </div>
          )}

          {!isLoading && !isError && flatResults.length === 0 && (
            <div className="p-4 text-center text-slate-500 space-y-1">
              <Package className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="font-medium text-slate-800 dark:text-slate-200">
                No se encontraron productos en el catálogo
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
            flatResults.map((item, index) => {
              const isAlreadyAdded = disabledSupplierProductIds.includes(item.id);
              const isSelected = activeIndex === index;

              return (
                <div
                  key={item.id}
                  id={`catalog-opt-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isAlreadyAdded}
                  onMouseEnter={() => {
                    if (!isAlreadyAdded) setActiveIndex(index);
                  }}
                  onClick={() => handleSelectProduct(item)}
                  className={cn(
                    'p-2.5 flex items-center justify-between gap-3 transition-colors',
                    isAlreadyAdded
                      ? 'bg-slate-50/50 dark:bg-slate-800/30 opacity-60 cursor-not-allowed text-slate-400'
                      : isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 cursor-pointer'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 cursor-pointer',
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.product?.name || 'Producto'}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px] rounded border border-slate-200 dark:border-slate-700">
                        {item.product?.internalCode}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                      <span>
                        SKU:{' '}
                        <strong className="font-mono text-slate-600 dark:text-slate-300">
                          {item.supplierExternalCode}
                        </strong>
                      </span>
                      <span>
                        U. Compra: {item.purchaseUnit?.name} ({item.purchaseUnit?.symbol})
                      </span>
                      <span>Factor: {item.conversionFactorToBase}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isAlreadyAdded ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Ya agregado
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.usualCostNet !== null && item.usualCostNet !== undefined ? (
                          formatCurrency(item.usualCostNet)
                        ) : (
                          <span className="text-slate-400 text-[11px] font-normal italic">
                            Sin costo habitual
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Load More Button for Infinite Scrolling (>20 items) */}
          {hasNextPage && (
            <div className="p-2 text-center bg-slate-50 dark:bg-slate-800/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                className="w-full text-xs h-7 text-blue-600 hover:text-blue-700 font-medium"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                ) : (
                  'Cargar más productos del catálogo...'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

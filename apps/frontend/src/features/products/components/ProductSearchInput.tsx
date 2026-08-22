import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, X, Loader2, Package, AlertCircle } from 'lucide-react';
import { useProductSearchQuery } from '../hooks/use-product-search-query';
import { formatCurrency } from '../utils/products.math';
import type { IProductSummary } from '../types/products.types';

export interface ProductSearchInputProps {
  onSelect: (product: IProductSummary | null) => void;
  value?: IProductSummary | null;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
  onSelect,
  value,
  placeholder = 'Buscar por código (ej: P0001) o nombre...',
  disabled = false,
  autoFocus = false,
  className = '',
  ariaLabel = 'Buscar producto',
}) => {
  const [searchTerm, setSearchTerm] = useState(
    value ? `${value.internalCode} - ${value.name}` : '',
  );
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedItem, setSelectedItem] = useState<IProductSummary | null>(value ?? null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Synchronize when external value prop changes
  useEffect(() => {
    if (value) {
      setSelectedItem(value);
      setSearchTerm(`${value.internalCode} - ${value.name}`);
    } else if (value === null) {
      setSelectedItem(null);
      setSearchTerm('');
    }
  }, [value]);

  // Single 300 ms debounce layer in UI
  useEffect(() => {
    if (selectedItem && searchTerm === `${selectedItem.internalCode} - ${selectedItem.name}`) {
      setDebouncedTerm('');
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedItem]);

  // TanStack Query Typeahead Hook
  const {
    data: results = [],
    isLoading,
    isFetching,
    isError,
  } = useProductSearchQuery(debouncedTerm, { enabled: isOpen && debouncedTerm.trim().length >= 2 });

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
    setSelectedItem(null);
    setIsOpen(true);
    setActiveIndex(-1);

    if (nextVal.trim() === '') {
      onSelect(null);
    }
  };

  const handleSelectProduct = (product: IProductSummary) => {
    setSelectedItem(product);
    setSearchTerm(`${product.internalCode} - ${product.name}`);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(product);
  };

  const handleClear = () => {
    setSearchTerm('');
    setDebouncedTerm('');
    setSelectedItem(null);
    setIsOpen(false);
    setActiveIndex(-1);
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelectProduct(results[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const showDropdown = isOpen && !disabled && (debouncedTerm.trim().length >= 2 || isLoading);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
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
            if (searchTerm.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `product-option-${results[activeIndex].id}`
              : undefined
          }
          className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-900 placeholder:text-slate-400"
        />

        {/* Clear & Loading Icons */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {(isLoading || isFetching) && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          )}

          {searchTerm.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpiar búsqueda"
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Combobox Dropdown Results */}
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-72 overflow-y-auto py-1 text-xs divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Loading State */}
          {(isLoading || isFetching) && results.length === 0 && (
            <div className="p-4 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Buscando productos...</span>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="p-4 text-center text-red-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Error al buscar productos. Intente nuevamente.</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && results.length === 0 && (
            <div className="p-4 text-center text-slate-500 space-y-1">
              <Package className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="font-medium text-slate-800">No se encontraron productos activos</p>
              <p className="text-[11px] text-slate-400">
                No hay coincidencias para "{debouncedTerm}"
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading &&
            !isError &&
            results.map((product, index) => {
              const isSelected = activeIndex === index;

              return (
                <div
                  key={product.id}
                  id={`product-option-${product.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelectProduct(product)}
                  className={`p-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 text-blue-900'
                      : 'hover:bg-slate-50/80 text-slate-700'
                  }`}
                >
                  {/* Left: Code, Name, Base Unit */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-semibold rounded text-[11px] border border-slate-200 shrink-0">
                      {product.internalCode}
                    </span>

                    <div className="min-w-0 truncate">
                      <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        Unidad: {product.baseUnit.name} ({product.baseUnit.symbol})
                      </p>
                    </div>
                  </div>

                  {/* Right: Stock Badge & Active Price */}
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    {/* Explicit Stock Badge Differentiation */}
                    {product.currentStock === null ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Stock: Sin datos
                      </span>
                    ) : product.currentStock === 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Sin stock (0)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                        {product.currentStock} {product.baseUnit.symbol}
                      </span>
                    )}

                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(product.activePriceNet)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

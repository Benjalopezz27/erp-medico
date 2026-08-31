import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Search, UserRound, X } from 'lucide-react';
import type { ICustomer } from '../types/customers.types';
import { useCustomersQuery } from '../hooks/use-customers-query';

export interface CustomerSearchInputProps {
  value: ICustomer | null;
  onSelect: (customer: ICustomer | null) => void;
  disabled?: boolean;
  allowAnonymous?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

export function CustomerSearchInput({
  value,
  onSelect,
  disabled = false,
  allowAnonymous = true,
  placeholder = 'Buscar cliente por nombre o documento…',
  ariaLabel = 'Buscar cliente',
}: CustomerSearchInputProps) {
  const [term, setTerm] = useState(value?.businessName ?? '');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    setTerm(value?.businessName ?? '');
  }, [value]);

  useEffect(() => {
    if (value && term === value.businessName) {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term, value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const query = useCustomersQuery(
    {
      page: 1,
      limit: 10,
      search: debounced.length >= 2 ? debounced : undefined,
      isActive: true,
      sortBy: 'businessName',
      sortOrder: 'ASC',
    },
    debounced.length >= 2,
    false,
  );
  const results = useMemo(
    () => (debounced.length >= 2 ? (query.data?.data ?? []) : []),
    [debounced, query.data?.data],
  );
  const show = open && debounced.length >= 2;

  const choose = (customer: ICustomer) => {
    onSelect(customer);
    setTerm(customer.businessName);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={rootRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        ref={inputRef}
        value={term}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={
          activeIndex >= 0 ? `customer-option-${results[activeIndex]?.id}` : undefined
        }
        onFocus={() => term.trim().length >= 2 && setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (value) onSelect(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(current + 1, results.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter' && activeIndex >= 0) {
            event.preventDefault();
            choose(results[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
      />
      <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
        {query.isFetching && debounced.length >= 2 && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
        {(term || value) && !disabled && (
          <button
            type="button"
            aria-label={allowAnonymous ? 'Usar cliente anónimo' : 'Limpiar cliente'}
            onClick={() => {
              setTerm('');
              setDebounced('');
              onSelect(null);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {show && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {query.isError && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-600">
              <AlertCircle className="h-4 w-4" /> Error al buscar clientes.
            </div>
          )}
          {!query.isFetching && !query.isError && results.length === 0 && (
            <div className="p-3 text-center text-xs text-slate-500">
              No se encontraron clientes activos.
            </div>
          )}
          {results.map((customer, index) => (
            <button
              id={`customer-option-${customer.id}`}
              key={customer.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(customer)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <UserRound className="h-4 w-4 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">
                  {customer.businessName}
                </span>
                <span className="block font-mono text-[10px] text-slate-500">
                  {customer.cuitOrDni}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Bookmark, Unlink, Trash2, Save } from 'lucide-react';
import type { ISupplierImportTemplateSummary } from '../../types/importer.types';

interface AppliedTemplateBadgeProps {
  appliedTemplate: ISupplierImportTemplateSummary | null;
  onUnlink: () => void;
  onOpenSaveModal: () => void;
  onOpenDeleteModal?: () => void;
  isModified?: boolean;
}

export const AppliedTemplateBadge: React.FC<AppliedTemplateBadgeProps> = ({
  appliedTemplate,
  onUnlink,
  onOpenSaveModal,
  onOpenDeleteModal,
  isModified = false,
}) => {
  if (!appliedTemplate) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Bookmark className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span>Mapeo manual (sin plantilla vinculada)</span>
        </div>
        <button
          type="button"
          onClick={onOpenSaveModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors"
        >
          <Save className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          Guardar como plantilla
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
          <Bookmark className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Plantilla aplicada:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {appliedTemplate.name}
            </span>
            {isModified && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                Modificado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Las columnas se configuraron automáticamente según el formato del proveedor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onUnlink}
          title="Desvincular la plantilla conservando las columnas seleccionadas"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Unlink className="w-3.5 h-3.5 text-gray-500" />
          Desvincular
        </button>
        {isModified && (
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar cambios
          </button>
        )}
        {onOpenDeleteModal && (
          <button
            type="button"
            onClick={onOpenDeleteModal}
            title="Eliminar plantilla del sistema"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

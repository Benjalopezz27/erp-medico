import React from 'react';
import {
  CheckCircle2,
  HelpCircle,
  AlertOctagon,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import type { IImporterPreviewSummary } from '../../types/importer.types';

interface PreviewSummaryCardsProps {
  summary: IImporterPreviewSummary;
  activeTab: 'valid' | 'unknown' | 'error';
  onTabChange: (tab: 'valid' | 'unknown' | 'error') => void;
}

export const PreviewSummaryCards: React.FC<PreviewSummaryCardsProps> = ({
  summary,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="space-y-4">
      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rows */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total de Filas
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary.totalRows}
            </p>
          </div>
        </div>

        {/* Valid Rows Card (Clickable to switch tab) */}
        <button
          type="button"
          onClick={() => onTabChange('valid')}
          className={`text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
            activeTab === 'valid'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Filas Válidas
            </p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {summary.validRows}
            </p>
          </div>
        </button>

        {/* Unknown Rows Card (Clickable to switch tab) */}
        <button
          type="button"
          onClick={() => onTabChange('unknown')}
          className={`text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
            activeTab === 'unknown'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="p-3 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              SKUs Desconocidos
            </p>
            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {summary.unknownRows}
            </p>
          </div>
        </button>

        {/* Error Rows Card (Clickable to switch tab) */}
        <button
          type="button"
          onClick={() => onTabChange('error')}
          className={`text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
            activeTab === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700'
          }`}
        >
          <div className="p-3 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Filas con Error
            </p>
            <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
              {summary.errorRows}
            </p>
          </div>
        </button>
      </div>

      {/* Dynamic Status Alert Banner */}
      {summary.canContinue ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Vista previa validada exitosamente
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Todas las filas son válidas ({summary.validRows} filas listas). No hay errores ni SKUs
              pendientes. Puede avanzar a la confirmación de la importación.
            </p>
          </div>
        </div>
      ) : summary.errorRows > 0 ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              El archivo contiene filas con errores bloqueantes ({summary.errorRows})
            </p>
            <p className="text-sm text-rose-700 dark:text-rose-300">
              Se detectaron filas con sintaxis inválida, valores no numéricos, unidades
              incompatibles o SKUs duplicados. Debe corregir el archivo original y volver a cargarlo
              para poder continuar.
            </p>
          </div>
        </div>
      ) : summary.unknownRows > 0 ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Se encontraron SKUs de proveedor no asociados ({summary.unknownRows})
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Debe asociar cada SKU desconocido a un producto del catálogo interno antes de poder
              confirmar la importación. Utilice el botón "Asociar" en la pestaña de Desconocidos.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

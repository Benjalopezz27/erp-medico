import React, { useState } from 'react';
import { Settings, Plus, CheckCircle2, X } from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Categories feature
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { CategoriesTable } from '@/features/categories/components/CategoriesTable';
import { CategoryFormModal } from '@/features/categories/components/CategoryFormModal';
import { CategoryDeleteModal } from '@/features/categories/components/CategoryDeleteModal';
import type { ICategory } from '@/features/categories/types/categories.types';

// Units feature
import { useUnitsQuery } from '@/features/units/hooks/use-units-query';
import { UnitsTable } from '@/features/units/components/UnitsTable';
import { UnitFormModal } from '@/features/units/components/UnitFormModal';
import { UnitDeleteModal } from '@/features/units/components/UnitDeleteModal';
import type { IUnit } from '@/features/units/types/units.types';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMINISTRADOR;

  const [activeTab, setActiveTab] = useState<string>('categories');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Categories query & state
  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    refetch: refetchCategories,
  } = useCategoriesQuery();

  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ICategory | null>(null);

  // Units query & state
  const {
    data: units,
    isLoading: isUnitsLoading,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useUnitsQuery();

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<IUnit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<IUnit | null>(null);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryFormOpen(true);
  };

  const handleEditCategory = (category: ICategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = (category: ICategory) => {
    setDeletingCategory(category);
  };

  const handleCreateUnit = () => {
    setEditingUnit(null);
    setIsUnitFormOpen(true);
  };

  const handleEditUnit = (unit: IUnit) => {
    setEditingUnit(unit);
    setIsUnitFormOpen(true);
  };

  const handleDeleteUnit = (unit: IUnit) => {
    setDeletingUnit(unit);
  };

  const showSuccess = (message: string) => {
    setSuccessNotice(message);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Configuración del Sistema
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestión de datos maestros, categorías y unidades de medida del catálogo
            </p>
          </div>
        </div>
      </div>

      {/* Success Feedback Banner */}
      {successNotice && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/60 rounded"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <TabsList>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
            <TabsTrigger value="units">Unidades de Medida</TabsTrigger>
          </TabsList>

          {/* Action button corresponding to active tab */}
          {isAdmin && (
            <div>
              {activeTab === 'categories' ? (
                <Button
                  onClick={handleCreateCategory}
                  size="sm"
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Categoría</span>
                </Button>
              ) : (
                <Button
                  onClick={handleCreateUnit}
                  size="sm"
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Unidad</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tab 1: Categories */}
        <TabsContent value="categories">
          <CategoriesTable
            categories={categories}
            isLoading={isCategoriesLoading}
            isError={isCategoriesError}
            onRetry={refetchCategories}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Tab 2: Units */}
        <TabsContent value="units">
          <UnitsTable
            units={units}
            isLoading={isUnitsLoading}
            isError={isUnitsError}
            onRetry={refetchUnits}
            onEdit={handleEditUnit}
            onDelete={handleDeleteUnit}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>

      {/* Category Modals */}
      <CategoryFormModal
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        categoryToEdit={editingCategory}
        onSuccessNotice={showSuccess}
      />

      <CategoryDeleteModal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        categoryToDelete={deletingCategory}
        onSuccessNotice={showSuccess}
      />

      {/* Unit Modals */}
      <UnitFormModal
        isOpen={isUnitFormOpen}
        onClose={() => setIsUnitFormOpen(false)}
        unitToEdit={editingUnit}
        onSuccessNotice={showSuccess}
      />

      <UnitDeleteModal
        isOpen={Boolean(deletingUnit)}
        onClose={() => setDeletingUnit(null)}
        unitToDelete={deletingUnit}
        onSuccessNotice={showSuccess}
      />
    </div>
  );
};

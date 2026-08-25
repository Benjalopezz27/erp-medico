interface SupplierStatusBadgeProps {
  isActive: boolean;
}

export function SupplierStatusBadge({ isActive }: SupplierStatusBadgeProps) {
  if (isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        Activo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Inactivo
    </span>
  );
}

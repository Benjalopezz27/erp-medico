import type { OnboardingStepId } from '@erp/shared-types';

export interface StepMeta {
  title: string;
  description: string;
  /** Pantalla existente donde se carga el dato. */
  to: string;
}

export const STEP_META: Record<OnboardingStepId, StepMeta> = {
  fiscal: {
    title: 'Empresa y fiscal',
    description: 'Razón social, CUIT, condición ante IVA y punto de venta ARCA.',
    to: '/settings',
  },
  users: {
    title: 'Usuarios',
    description: 'Al menos un administrador activo para operar el puesto.',
    to: '/admin/users',
  },
  'catalog-base': {
    title: 'Categorías y unidades',
    description: 'Lo mínimo para poder cargar un producto: una categoría y una unidad.',
    to: '/settings',
  },
  products: {
    title: 'Productos, precios y costos',
    description: 'Carga inicial del catálogo.',
    to: '/products',
  },
  parties: {
    title: 'Clientes y proveedores',
    description: 'Cargá al menos un cliente o un proveedor.',
    to: '/customers',
  },
  treasury: {
    title: 'Tesorería',
    description: 'Saldo inicial de efectivo y bancos.',
    to: '/treasury',
  },
  stock: {
    title: 'Stock inicial',
    description: 'Cantidades de arranque sobre el catálogo cargado.',
    to: '/stock',
  },
};

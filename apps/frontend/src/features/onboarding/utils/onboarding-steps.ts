import type { OnboardingStepId } from '@erp/shared-types';

export interface StepMeta {
  title: string;
  description: string;
  /** Pantalla existente donde se carga; `null` si el paso se resuelve en el wizard. */
  to: string | null;
  linkLabel?: string;
}

export const STEP_META: Record<OnboardingStepId, StepMeta> = {
  fiscal: {
    title: 'Empresa y fiscal',
    description: 'Razón social, CUIT, condición ante IVA y punto de venta ARCA.',
    to: null,
  },
  users: {
    title: 'Usuarios',
    description: 'Al menos un administrador activo para operar el puesto.',
    to: '/admin/users',
    linkLabel: 'Ir a Usuarios',
  },
  'catalog-base': {
    title: 'Categorías y unidades',
    description: 'Mínimo necesario para poder cargar un producto: una categoría y una unidad.',
    to: '/settings',
    linkLabel: 'Ir a Configuración',
  },
  products: {
    title: 'Productos, precios y costos',
    description: 'Carga inicial del catálogo.',
    to: '/products',
    linkLabel: 'Ir a Productos',
  },
  parties: {
    title: 'Clientes y proveedores',
    description: 'Carga inicial de clientes o proveedores.',
    to: '/customers',
    linkLabel: 'Ir a Clientes',
  },
  treasury: {
    title: 'Tesorería',
    description: 'Saldo inicial de efectivo y bancos. Omitir equivale a saldo cero.',
    to: '/treasury',
    linkLabel: 'Ir a Tesorería',
  },
  stock: {
    title: 'Stock inicial',
    description: 'Cantidades de arranque sobre el catálogo cargado.',
    to: '/stock',
    linkLabel: 'Ir a Stock',
  },
};

export const ONBOARDING_PATH = '/onboarding';

/** Rutas que el wizard enlaza: no se bloquean mientras falte configuración. */
const ALLOWED_PREFIXES = [
  ONBOARDING_PATH,
  '/admin/users',
  '/settings',
  '/products',
  '/customers',
  '/suppliers',
  '/treasury',
  '/stock',
  '/importer',
  '/account',
  '/help',
];

export function isAllowedDuringOnboarding(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

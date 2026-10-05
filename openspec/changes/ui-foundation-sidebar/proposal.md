## Why

La UI actual se percibe pobre: sin fuente de marca, bordes cuadrados, sidebar oscuro con 6 acordeones (17 ítems) donde el usuario debe expandir grupos para encontrar una pantalla, y usuario/cerrar sesión en el topbar. Las pantallas de uso diario (ventas, productos, stock) quedan enterradas. Este change fija la base visual y reordena la navegación; es la Fase 1 y 2 de un rediseño UX/UI de 5 fases.

## What Changes

- Fuente **Poppins** self-hosted (`@fontsource/poppins`, pesos 400/500/600/700) como `font-sans` global.
- Radios más suaves de forma global (`lg`=0.75rem, `xl`=1rem, `2xl`=1.25rem y `--radius`), más primitivas de `components/ui` ajustadas (Card, Button, Input, Select, Modal, Badge pill), sombras suaves, bordes `slate-200/60` y fondo de página `slate-50`.
- Sidebar claro, fijo a alto completo (`sticky top-0 h-screen`), con scroll solo en `<main>`.
- Botón de colapsar: 256px ↔ 72px con animación; colapsado muestra solo íconos con tooltip y badges como punto; estado persistido en `localStorage`; en mobile sigue siendo drawer.
- Marca "Distribuidora Médica"; se elimina "Sprint 0 • v0.1.0".
- Footer del sidebar con avatar de iniciales, nombre, email, rol y botón cerrar sesión. Se quitan del `Topbar`, que conserva hamburguesa y breadcrumb.
- **BREAKING (navegación):** se eliminan los acordeones; lista plana por secciones: Plataforma (Inicio, Ventas, Productos, Stock, Clientes), Abastecimiento (Compras, Proveedores), Finanzas (Tesorería, Reportes), Administración (Usuarios, Alertas fiscales, Configuración). Secciones y ítems admin respetan `isRouteAllowed`.
- Pantallas unificadas (salen del sidebar, se acceden desde su pantalla padre):
  - Revisión de precios → botón en Productos, con el badge de pendientes.
  - Importador → botón en Proveedores.
  - Caja y Cheques → navegación por tabs dentro de Tesorería.
  - Cta Cte → botón en Clientes.
  - Cuarentena → botón en Stock (ya existe; se conserva).
- Se actualizan `Sidebar.spec` y `Topbar.spec`.

## Capabilities

### New Capabilities

- `visual-foundation`: tipografía, escala de radios, sombras, bordes y fondo base de la UI.
- `app-shell-navigation`: sidebar (estructura, colapso, footer de usuario), topbar, y accesos a pantallas unificadas.

### Modified Capabilities

<!-- No existen specs principales en openspec/specs; todo es nuevo. -->

## Impact

- `apps/frontend`: `package.json` (+`@fontsource/poppins`), `tailwind.config.js`, `src/index.css`, `src/main.tsx`, `components/ui/*`, `components/layout/{Sidebar,AppShell,Topbar}.tsx` y sus specs, `ProductsListPage`, `SuppliersPage`, `CustomersListPage`, `TreasuryPage`, `ChecksPage`, `CashRegisterPage`, `PriceReviewsPage`.
- Sin cambios de backend, rutas ni permisos. Las rutas existentes siguen vigentes (solo cambia cómo se llega).
- Fuera de alcance (changes siguientes): ordenar tablas (3), dead clicks y `BackLink` (4), pantallas 404/403/500 (5).

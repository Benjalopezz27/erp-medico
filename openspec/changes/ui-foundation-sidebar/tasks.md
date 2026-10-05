# Tasks

## 1. Base visual

- [x] 1.1 Agregar `@fontsource/poppins` (pnpm, workspace frontend), importar pesos 400/500/600/700 en `main.tsx` y configurar `fontFamily.sans` en `tailwind.config.js`; verificar con `pnpm --filter frontend build` y que el CSS final incluya los archivos de fuente
- [x] 1.2 Sobrescribir `theme.borderRadius` (lg 0.75rem, xl 1rem, 2xl 1.25rem) y `--radius` en `index.css`; verificar visualmente que un `rounded-xl` existente toma el nuevo radio
- [x] 1.3 Ajustar primitivas `components/ui` (Card/Modal 2xl, Button/Input/Select xl, Badge pill, sombra suave, borde `slate-200/60`) y verificar con los specs de ui (`tabs`, `modal`, `skeleton`, `empty-state`)
- [ ] 1.4 Poner fondo `slate-50` en el área de contenido y verificar contraste con cards blancas en Dashboard, Ventas y Productos
- [ ] 1.5 Revisar alineación de montos con Poppins en tablas de ventas, stock, Cta Cte y reportes; aplicar `tabular-nums` donde falle y verificar visualmente

## 2. Sidebar y shell

- [x] 2.1 Reemplazar `navigationEntries` por secciones planas (Plataforma, Abastecimiento, Finanzas, Administración) con `matchPrefixes` para rutas hijas, filtrado por `isRouteAllowed` y omisión de secciones vacías; verificar con `Sidebar.spec` actualizado (admin ve 12 ítems, vendedor solo los permitidos)
- [x] 2.2 Rediseñar `Sidebar` claro (marca "Distribuidora Médica", ítem activo resaltado, etiquetas de sección) y eliminar "Sprint 0 • v0.1.0"; verificar con spec que el texto no existe
- [x] 2.3 Implementar colapso (256px↔72px animado, solo íconos con `title`/`aria-label`, badges como punto) con estado en `AppShell` persistido en `localStorage` con try/catch; verificar con spec de colapso y persistencia
- [ ] 2.4 Hacer el sidebar `sticky top-0 h-screen` y dejar el scroll solo en `<main>`; verificar manualmente con una pantalla larga y mobile (drawer sigue funcionando)
- [x] 2.5 Agregar footer de usuario en el sidebar (avatar con iniciales, nombre, email, rol, botón cerrar sesión con `sessionTerminator`) y quitarlo del `Topbar`; verificar con `Sidebar.spec` y `Topbar.spec` actualizados
- [x] 2.6 Simplificar `Topbar` a hamburguesa + breadcrumb y actualizar `routeTitles` para rutas que quedaron sin título; verificar con `Topbar.spec`

## 3. Pantallas unificadas

- [x] 3.1 Agregar en `ProductsListPage` el botón "Revisión de precios" (solo admin) con el contador de pendientes y `data-testid="price-reviews-pending-badge"`; verificar con `ProductsListPage.spec`
- [x] 3.2 Agregar botón "Importador" en `SuppliersPage` y verificar que navega a `/importer` (spec de `SuppliersPage`)
- [x] 3.3 Crear `TreasuryNavigationTabs` (Tesorería, Caja, Cheques, patrón de `PurchasesNavigationTabs`) y usarlo en `TreasuryPage`, `CashRegisterPage` y `ChecksPage`; verificar con specs de esas páginas
- [x] 3.4 Agregar botón "Cuentas corrientes" en `CustomersListPage` hacia `/receivables`; verificar con `CustomersListPage.spec`
- [x] 3.5 Confirmar que el botón de Cuarentena en `StockOverviewPage` se conserva; verificar con `StockOverviewPage.spec`

## 4. Verificación final

- [x] 4.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores
- [ ] 4.2 Recorrido manual con rol administrador y rol vendedor: sidebar, colapso, mobile, permisos, acceso a Importador, Cta Cte, Caja, Cheques, Revisión de precios y Cuarentena

# Tasks

## 1. Componentes base

- [x] 1.1 Crear `BackLink` (historial interno con `useCanGoBack`, respaldo explícito, estilo único); verificar con spec: con historial vuelve atrás, sin historial navega al respaldo
- [x] 1.2 Crear `ClickableRow` (foco, Enter, hover, ignora click en controles internos); verificar con spec de click en celda, Enter y click en botón interno

## 2. Dead clicks

- [x] 2.1 Hacer clickeable la tarjeta completa de los 5 KPI de `KpiCards`; verificar con `DashboardPage.spec` (click en el título navega, links existentes intactos)
- [x] 2.2 Usar `ClickableRow` en clientes, deudores, órdenes de compra y alertas fiscales; verificar con spec de cada tabla
- [x] 2.3 Usar `ClickableRow` en productos, stock y proveedores sin romper sus botones; verificar con spec de cada tabla
- [x] 2.4 Migrar `SalesTable` y `SupplierInvoicesTable` a `ClickableRow`; verificar con sus specs existentes
- [x] 2.5 Revisar tablas sin detalle y quitar cualquier `cursor-pointer`/hover de fila engañoso; verificar con búsqueda en código de esas tablas

## 3. Volver

- [x] 3.1 Agregar `BackLink` en Revisión de precios, Cuentas corrientes, Caja, Cheques, Reporte y Punto de venta; verificar con spec de cada página
- [x] 3.2 Reemplazar los "Volver" de detalle y formularios (stock, venta, cliente, producto, OC, factura, catálogo, recibo, cobro, markups) por `BackLink` con respaldo; verificar con sus specs y que filtros y página se restauran
- [ ] 3.3 Test de regresión: toda ruta de detalle/formulario/subpantalla renderiza un enlace "Volver a …"

## 4. Verificación final

- [x] 4.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores
- [ ] 4.2 Prueba manual: click en tarjetas y filas, teclado, filtrar → detalle → volver

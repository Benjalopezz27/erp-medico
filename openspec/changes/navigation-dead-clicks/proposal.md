## Why

Hay elementos que parecen clickeables y no hacen nada, o pantallas sin salida clara: las tarjetas de KPI del dashboard solo linkean por un texto chico, la mayoría de las tablas navega solo desde una celda y no desde la fila, y pantallas como Revisión de precios y Cuentas corrientes no tienen "Volver". Además los "Volver" existentes tienen textos y comportamientos distintos y varios pierden los filtros del listado. Es la Fase 4 del rediseño UX/UI.

## What Changes

- Tarjetas de KPI del dashboard completamente clickeables hacia su módulo.
- Filas de tabla clickeables hacia su detalle (con cursor, hover y foco de teclado, sin interferir con botones y links internos) en clientes, cuentas corrientes, órdenes de compra, alertas fiscales, productos (edición), stock (movimientos del producto) y proveedores (catálogo). Ventas y facturas de proveedor ya lo tienen. Las tablas sin pantalla de detalle (usuarios, categorías, unidades, cuarentena, revisión de precios, tesorería, cheques, reportes) no aparentan ser clickeables.
- Componente único `BackLink` con texto "Volver a …" y flecha. Si hay historial de navegación vuelve atrás (restaurando filtros, orden y página del listado); si no, va a un destino de respaldo explícito.
- "Volver" agregado donde falta: Revisión de precios, Cuentas corrientes, Caja, Cheques, Reporte, Punto de venta. Los "Volver" existentes de detalle y formularios pasan a `BackLink`.

## Capabilities

### New Capabilities

- `navigation-affordances`: elementos clickeables sin clicks muertos y navegación de retorno consistente.

### Modified Capabilities

<!-- No existen specs principales vigentes. -->

## Impact

- Frontend: `components/ui` (o `components/layout`) con `BackLink` y `ClickableRow`, `KpiCards`, tablas listadas y las páginas que reciben o reemplazan su "Volver" (unas 25). Sin cambios de backend, rutas ni permisos.
- Tests: specs de cada tabla y página afectada, más specs de los dos componentes nuevos.

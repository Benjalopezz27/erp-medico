## Why

Ninguna tabla de la aplicación se puede ordenar por columna: los listados vienen en un orden fijo del backend y el usuario no puede, por ejemplo, ver primero las ventas de mayor monto o los productos con menos stock. Es la Fase 3 del rediseño UX/UI.

## What Changes

- Todas las tablas de datos de listado muestran en cada encabezado ordenable un control para ordenar ascendente y descendente (ciclo asc → desc → orden por defecto), con indicador visual y `aria-sort`.
- Tablas paginadas ordenan en el **servidor** (parámetros `sortBy` y `sortOrder` en la URL y en la API) para que el orden aplique a todo el conjunto y no solo a la página visible: productos, clientes, proveedores, catálogo de proveedor, usuarios, ventas, stock, movimientos de stock, cuarentena, órdenes de compra, facturas de proveedor, deudores (cuentas corrientes), alertas fiscales, revisión de precios, movimientos de tesorería y cheques.
- Tablas completas en memoria ordenan en el **cliente**: categorías, unidades y reportes (la fila `TOTAL` queda siempre al final).
- Cada endpoint acepta solo columnas de una lista blanca; un valor inválido responde 400. Sin parámetros, el orden actual no cambia.
- Excluidas: tablas de edición o carga (carrito del POS, ítems de OC, líneas de recepción, mapeo e previews del importador), líneas de detalle y las tarjetas agrupadas de mercadería pendiente.
- Cambiar el orden vuelve a la página 1.

## Capabilities

### New Capabilities

- `table-sorting`: contrato de ordenamiento por columna en tablas de listado (UI, URL y API).

### Modified Capabilities

<!-- No existen specs principales vigentes. -->

## Impact

- `packages/shared-types`: tipo `SortOrder` y parámetros de orden.
- Backend: DTOs y servicios de los 16 listados paginados (lista blanca de columnas, desempate estable por id). Clientes, proveedores, catálogo de proveedor y usuarios ya soportan `sortBy`/`sortOrder`; el resto es nuevo. Deudores usa SQL crudo y stock tiene columnas derivadas.
- Frontend: componente `SortableTh` y utilidades compartidas, validadores de search params en `router.tsx` y esquemas, capa de API, y todas las tablas listadas. Tesorería y Cheques usan estado local en lugar de URL.
- Sin migraciones. Sin cambios en el orden por defecto.

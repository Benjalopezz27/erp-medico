# Design

## Context

Convención ya existente en backend para clientes, proveedores, catálogo de proveedor y usuarios: DTO `sortBy` + `sortOrder`, lista blanca `Record<campo, columna>` en el servicio y desempate por `id`. Clientes, proveedores y catálogo ya parsean `sortBy`/`sortOrder` en el validador de search params del router pero sus tablas no tienen UI de orden. El resto de los listados usa `ORDER BY` fijo (QueryBuilder), deudores usa SQL crudo y los reportes un `ORDER BY` por definición. Ver proposal.md.

## Goals / Non-Goals

**Goals:** una única convención `sortBy`/`sortOrder` en toda la app; un único componente de encabezado; sin cambiar el orden por defecto.

**Non-Goals:** orden multi-columna, orden por columnas de tablas de edición, persistencia del orden entre sesiones.

## Decisions

- **Convención `sortBy` (clave de lista blanca) + `sortOrder` (`ASC`|`DESC`)** reutilizando la ya vigente. `SortOrder` y un helper de validación viven en `packages/shared-types` para backend y frontend.
- **Servidor para paginadas, cliente para completas.** Ordenar solo la página visible sería engañoso. Alternativa descartada: todo en cliente.
- **Helper backend `resolveSort(map, sortBy, sortOrder, default)`** que devuelve `[columna, dirección]` con la lista blanca, para evitar repetir el `Record` y la validación en 16 servicios. El DTO usa `@IsIn(Object.keys(map))` por endpoint (400 si inválido). Desempate siempre por `id`.
- **Columnas derivadas por expresión SQL equivalente a la que se muestra**: stock actual con `COALESCE(stock.current_base_stock, 0)`, estado de stock con `CASE` sobre la misma regla que `deriveStockStatus`, saldo y antigüedad con los alias ya existentes en la consulta de deudores (lista blanca de alias).
- **Frontend**: `SortableTh` (botón dentro de `<th aria-sort>`) + `nextSort(current, key)` puro; el estado sale de los search params del router (`sortBy`, `sortOrder`) con `validateSearch` ampliado. Tesorería y Cheques no usan URL para paginar: el orden va en el mismo estado local.
- **Orden cliente**: `useClientSort(rows, columns)` con comparador por tipo (`number`/`money` por `Decimal`, texto con `localeCompare('es')`); en reportes la fila cuya primera celda es `TOTAL` se separa antes de ordenar.
- **Usuarios**: el backend ya soporta orden; solo se conecta frontend.

## Risks / Trade-offs

- [16 endpoints tocados pueden romper el orden por defecto] → Test por endpoint de que sin parámetros el orden es el actual.
- [Orden por columnas con joins (categoría, cliente) puede duplicar filas con `skip/take`] → Usar la columna del join ya cargada y verificar con test de paginación en productos.
- [Estado de stock derivado puede divergir de `deriveStockStatus`] → Test que compara el orden SQL con el estado calculado.
- [Muchos archivos de frontend] → Cambio mecánico por tabla, validado por tests de cada tabla y type-check.

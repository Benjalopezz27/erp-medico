## Why

La card "Actividad Reciente del Sistema" del dashboard (`DashboardPage.tsx`) es un texto fijo que nunca se conectó a datos: promete "tiempo real" pero no muestra nada, por lo que no se actualiza al registrar una venta, un cobro u otro movimiento. Además, los KPI del dashboard tampoco se invalidan al operar. El operador no tiene una vista rápida de lo último que pasó en el sistema.

## What Changes

- Nuevo endpoint `GET /dashboard/activity` que unifica los últimos eventos del dominio, ordenados por fecha descendente y limitados (por defecto 15, máximo 50): ventas confirmadas y anuladas, movimientos de stock manuales/de compra, cobros (recibos) y movimientos de tesorería manuales, de caja y de cheques.
- Visibilidad por rol: el **ADMINISTRADOR** ve todos los tipos; el **VENDEDOR** ve solo ventas y movimientos de stock.
- Para no duplicar un mismo hecho, los movimientos que ya están representados por otro evento se excluyen: stock de venta y de devolución de cliente (cubiertos por la venta), y tesorería de venta y de cobro (cubiertos por la venta y el recibo).
- Cada evento expone tipo, título, detalle, monto (solo cuando aplica, decimal como string), fecha, nombre del usuario y destino de navegación.
- Frontend: el placeholder se reemplaza por una lista real con estados cargando, vacío y error; cada evento linkea a su detalle. La data se refresca al volver a la pestaña, por polling corto (30 s) y al terminar mutaciones de venta, devolución, cobro, tesorería, caja, cheques y stock.
- Las mutaciones también invalidan los KPI (`['dashboard','kpis']`), con lo que las tarjetas del dashboard dejan de quedar desactualizadas.

## Capabilities

### New Capabilities

- `dashboard-activity`: feed unificado de actividad reciente del sistema, con permisos por rol, y su actualización automática en el dashboard.

### Modified Capabilities

<!-- No hay specs principales vigentes que modificar. -->

## Impact

- Backend: `modules/dashboard` (controller, service, DTO/tipos), tests. Sin migraciones: solo lectura sobre `sales`, `stock_movements`, `receipts`, `treasury_movements`, `customers`, `users`, `products`. Posible índice sobre `created_at` si el plan de consulta lo exige (ver design.md).
- Shared types: `IDashboardActivityItem`, `IDashboardActivity` y enum de tipo de evento en `packages/shared-types`.
- Frontend: `features/dashboard` (api, hook, componente), `DashboardPage.tsx`, y las mutaciones de ventas, devoluciones, pagos, tesorería, caja, cheques y stock para invalidar `['dashboard']`.
- El endpoint es nuevo y de solo lectura; `GET /dashboard/kpis` sigue siendo exclusivo del administrador y no cambia.

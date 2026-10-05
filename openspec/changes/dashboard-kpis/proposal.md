# Proposal

## Why

US-35 (issue #11): el Administrador necesita ver al abrir el sistema los indicadores del negocio. Hoy el dashboard muestra tarjetas estáticas con valores en cero.

## What Changes

- `GET /dashboard/kpis` (solo ADMINISTRADOR) con: ventas confirmadas del día y del mes (total con IVA), productos activos en o bajo el stock mínimo, facturas de proveedor `OBSERVADA` y cheques `RECIBIDO`/`EN_CARTERA` que vencen en los próximos 7 días.
- El dashboard del Administrador reemplaza las tarjetas estáticas por cinco tarjetas reales y clickeables que navegan a stock (bajo mínimo), facturas de proveedor observadas, cheques y ventas.
- El VENDEDOR deja de ver tarjetas de KPI con ceros falsos (el endpoint es solo ADMIN, como pide la US); conserva accesos rápidos.
- Fuera de alcance: "Últimas ventas" del wireframe, gráficos, KPIs de VENDEDOR y filtro de vencimiento en la pantalla de cheques.

## Capabilities

### New Capabilities

- `dashboard/dashboard-kpis`: indicadores ejecutivos del Administrador.

### Modified Capabilities

(ninguna)

## Impact

- Backend: módulo `dashboard` (servicio con SQL de solo lectura y controller). Sin migraciones.
- Frontend: `features/dashboard/`, `DashboardPage`.
- "Día" y "mes" son calendario argentino. "Bajo mínimo" usa la misma regla que el módulo de stock (`stock <= mínimo`) y el vencimiento de cheques la misma ventana que la pantalla de cheques.

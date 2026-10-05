# Design

## Context

`modules/dashboard` ya expone `GET /dashboard/kpis` (solo administrador) con SQL crudo vía `DataSource.query` y montos como `Decimal` string (`DashboardService`). El frontend usa TanStack Query (`useDashboardKpisQuery`, key `['dashboard','kpis']`). `modules/audit` solo registra gestión de usuarios y no sirve como fuente. Las fuentes de dominio observadas: `sales` (estado, `total_gross`, `created_at`/`updated_at`), `stock_movements` (`movement_type`, `quantity_base`, `user_id`), `receipts` (`receipt_number`, `total_amount`), `treasury_movements` (`reference_type`: `SALE`, `PAYMENT`, `CASH_REGISTER`, `CHECK`, `MANUAL`). Ver proposal.md para motivación.

## Goals / Non-Goals

**Goals:**

- Un único endpoint de lectura, sin migraciones, rápido y acotado.
- Montos exactos como string decimal.
- El dashboard refleja la actividad al operar.

**Non-Goals:**

- Auditoría o historial completo (paginación, filtros, exportación).
- Tiempo real por websockets/SSE.
- Eventos de compras, proveedores, productos o clientes.

## Decisions

- **Consulta SQL única con `UNION ALL` y `ORDER BY occurred_at DESC LIMIT $n`**, una rama por tipo (cada rama ya limitada a `$n` y ordenada) en vez de traer todo y mezclar en memoria. Sigue el patrón SQL crudo de `DashboardService`. Alternativa descartada: cuatro repositorios TypeORM y merge en JS (más viajes y más código).
- **El rol decide qué ramas se arman**, no un filtro posterior: el vendedor solo ejecuta las ramas de ventas y stock, de modo que los datos de cobros/tesorería nunca salen de la base para ese rol. El controller usa `JwtAuthGuard` + `RolesGuard` con ambos roles y el service recibe el rol.
- **Controller sin `@Roles` de clase compartido**: hoy el `@Roles(ADMINISTRADOR)` está a nivel de clase; se pasa a nivel de método (`kpis` queda admin, `activity` admite ambos roles) para no ampliar permisos de KPIs.
- **Deduplicación por exclusión en origen**: stock sin `SALIDA_VENTA` ni `DEVOLUCION_CLIENTE`; tesorería sin `reference_type IN ('SALE','PAYMENT')`. Cobros se leen de `receipts` (no de `payments`) porque son lo que el usuario reconoce y linkea a `/receipts/$id`.
- **Venta anulada usa `updated_at`** como fecha del evento y confirmada usa `created_at`. Limitación asumida: si una venta confirmada se anula, el evento de confirmación deja de mostrarse (el estado actual manda) y aparece el de anulación. Es aceptable para un feed de "lo último".
- **Contrato**: `IDashboardActivityItem { id, type, title, detail, amount: string | null, occurredAt: string, userName: string | null, link: { to, params? } }` en `packages/shared-types`, con enum `DashboardActivityType`. El backend arma `title`/`detail` (texto ya en español) y el link como ruta + parámetros, para que el frontend no reconstruya reglas de negocio.
- **Frontend**: `useDashboardActivityQuery` con `refetchInterval: 30_000`, `refetchIntervalInBackground: false` y `refetchOnWindowFocus: true`. Se invalida `['dashboard']` (prefijo) desde un `MutationCache.onSuccess` global en `query-client.ts`, lo que refresca feed y KPI tras cualquier mutación exitosa (incluidas recepciones de mercadería, que generan stock). Es una sola línea en vez de tocar cada hook, y las queries inactivas solo se marcan como vencidas. Alternativa descartada: invalidar solo `['dashboard','activity']` (dejaría los KPI desactualizados, mismo bug).
- **Presentación**: componente `ActivityFeed` con íconos por tipo, hora relativa con `Intl.RelativeTimeFormat('es-AR')` y cada ítem como `Link` tipado.

## Risks / Trade-offs

- [`UNION ALL` con `ORDER BY created_at` sobre tablas grandes] → Cada rama usa `ORDER BY ... LIMIT`; verificar con `EXPLAIN` y, solo si hace seq scan, agregar índice `created_at DESC` en una migración aparte (no se asume hoy).
- [Consulta cada 30 s por usuario con el dashboard abierto] → Es un puesto de trabajo único, carga baja; no hay polling con pestaña oculta.
- [Cambio de `@Roles` de clase a método puede dejar un endpoint sin protección por error] → Test de controller que verifica 403 de vendedor en `kpis` y 401 sin token en ambos.
- [Evento de confirmación desaparece al anular] → Documentado como limitación; el feed no es un registro de auditoría.
- [Texto armado en backend acopla el copy al API] → Aceptado por simplicidad; el tipo del evento permite que el frontend lo reemplace luego.

## Migration Plan

Sin migraciones ni datos nuevos. Despliegue normal por `dev`. Rollback: revertir; el placeholder vuelve y `GET /dashboard/kpis` no cambia.

# Tasks

## 1. Contrato compartido

- [x] 1.1 Agregar `DashboardActivityType` e `IDashboardActivityItem`/`IDashboardActivity` a `packages/shared-types` y exportarlos; verificar con `pnpm build` del paquete y que backend y frontend los importen sin errores de tipos

## 2. Backend

- [x] 2.1 Agregar DTO de query con `limit` (entero 1-50, default 15) y validación; verificar con test que `0` y `500` responden 400
- [x] 2.2 Implementar `DashboardService.getActivity(role, limit)` con una consulta `UNION ALL` por rama (ventas confirmadas/anuladas sin borradores, stock excluyendo `SALIDA_VENTA` y `DEVOLUCION_CLIENTE`, recibos, tesorería excluyendo `reference_type` `SALE` y `PAYMENT`), orden `occurred_at DESC` y `LIMIT`; verificar con tests de servicio de orden, límite, sin duplicados y montos decimales string
- [x] 2.3 Restringir las ramas por rol (vendedor solo ventas y stock); verificar con test de servicio que para vendedor no se ejecutan ni devuelven recibos ni tesorería
- [x] 2.4 Agregar `GET /dashboard/activity` y mover `@Roles` de clase a método para que `kpis` siga siendo solo administrador; verificar con test de controller: admin y vendedor 200, vendedor 403 en `kpis`, sin token 401
- [x] 2.5 Revisar el plan con `EXPLAIN` sobre datos locales y documentar en el PR si hace falta índice; verificar con la salida adjunta (sin migración salvo que haga seq scan relevante)

## 3. Frontend

- [x] 3.1 Agregar `getDashboardActivityApi` y `useDashboardActivityQuery` (`refetchInterval` 30 s, sin polling en segundo plano, `refetchOnWindowFocus`); verificar con test del hook (usa la key `['dashboard','activity']`)
- [x] 3.2 Crear `ActivityFeed` con estados cargando, vacío ("No hay actividad reciente") y error con reintentar, ítems como `Link` tipados con ícono, monto y hora relativa; verificar con spec de componente de cada estado y de navegación a una venta
- [x] 3.3 Reemplazar el placeholder en `DashboardPage.tsx` y mostrarlo a ambos roles; verificar con `DashboardPage.spec` (admin y vendedor ven el feed)
- [x] 3.4 Invalidar `['dashboard']` desde un `MutationCache.onSuccess` global en `query-client.ts`; verificar con spec de `query-client` que una mutación exitosa invalida esa key

- [x] 3.5 Paginar el feed en el cliente, 5 por página sobre los últimos 50 eventos (`limit=50`), con Anterior/Siguiente e indicador; verificar con spec de paginación de `ActivityFeed`

## 4. Verificación final

- [x] 4.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores
- [ ] 4.2 Prueba manual con backend local: crear una venta, un cobro y un movimiento manual de tesorería y comprobar que el feed y los KPI se actualizan al volver al dashboard, y que un vendedor no ve cobros ni tesorería

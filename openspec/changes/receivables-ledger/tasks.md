# Tasks

## 1. Shared types

- [x] 1.1 Corregir `IAccountReceivableMovement` en `packages/shared-types/src/models/receivables.model.ts` (montos `string`, sin `receiptId`) y agregar tipos de respuesta: resumen de cuenta, movimiento del ledger con saldo corrido, fila de lista global, estado `MOROSO | AL_DIA`. Verificar con `pnpm build` en `packages/shared-types` y typecheck del backend y frontend sin errores.

## 2. Migración

- [x] 2.1 Escribir migración `1700000000029` en `apps/backend/src/database/migrations/`: índice único parcial `UQ_arm_factura_per_ar` e `INSERT ... SELECT ... WHERE NOT EXISTS` del movimiento FACTURA para cuentas existentes con `original_amount > 0`; `down` documentado. Verificar con un spec de migración (patrón `database/migration-sales.spec.ts`) que correr `up` dos veces no duplica y que la consulta de cuentas sin FACTURA devuelve 0.
- [x] 2.2 Correr `pnpm db:migrate` y `pnpm db:revert` solo en la base local y verificar que ambos terminan sin error. No ejecutar contra staging/producción.

## 3. Escritura del ledger

- [x] 3.1 Test que falla primero en `receivables.service.spec.ts`: `recordCreditSaleDebt` inserta un movimiento `FACTURA` (previous 0, subsequent = total, `userId`) y lanza error si `totalGross` es 0. Verificar que el test falla antes del cambio.
- [x] 3.2 Agregar `userId` a `recordCreditSaleDebt` y escribir el movimiento; actualizar la llamada en `sales.service.ts:201` con `sale.userId`. Verificar que pasan `receivables.service.spec.ts` y `sales.service.spec.ts`.

## 4. Consultas

- [x] 4.1 Crear `ReceivablesQueryService` con resumen del cliente (saldo total, facturas PENDIENTE/PARCIAL, tramos 0-30/31-60/+60, límite y `exceedsCreditLimit`) usando `numeric` de PostgreSQL y fecha en `America/Argentina/Buenos_Aires`. Verificar con spec de servicio: 3 ventas $100/$200/$300 → "600.00"; tramos con facturas de 10 y 45 días; CANCELADO no suma; límite 0 → falso.
- [x] 4.2 Agregar el ledger paginado con saldo corrido por ventana SQL (orden `created_at`, `type_rank`, `id`). Verificar con spec: 5 movimientos de prueba dan saldos 1000/1500/1300/1600/1500, la página 2 conserva el acumulado y el último saldo corrido iguala el saldo total.
- [x] 4.3 Agregar la lista global agrupada por cliente con filtros `search` y `status` (vía `HAVING`), estado MOROSO > 30 días, orden por saldo descendente y paginación. Verificar con spec: moroso, al día, cliente sin deuda excluido, total de paginación correcto con filtro.

## 5. Endpoints

- [x] 5.1 Agregar `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMINISTRADOR, VENDEDOR)` a `ReceivablesController`, `GET /receivables` con DTO de query validado y Swagger; mantener `GET /receivables/status`. Verificar con e2e: 401 sin token, 200 como VENDEDOR, `status` sigue respondiendo.
- [x] 5.2 Crear `CustomerAccountController` (`customers/:id/account-receivable`) con DTOs de query (página, límite) y 404 para cliente inexistente; registrar providers en `ReceivablesModule` y en el módulo de customers lo que haga falta para validar existencia. Verificar con e2e: resumen + ledger correctos, 404, 401.

## 6. PDF

- [x] 6.1 Crear `AccountStatementPdfService` con `pdf-lib`: A4, datos del cliente, fecha, saldo, tramos, facturas pendientes, ledger con paginación manual y encabezado repetido. Verificar con spec unitario que el resultado empieza con `%PDF`, que un ledger largo produce más de una página y que cliente sin movimientos genera el documento.
- [x] 6.2 Agregar `GET /customers/:id/account-receivable/pdf` con `Content-Type: application/pdf` y `Content-Disposition` con nombre de archivo. Verificar con e2e: 200 y bytes `%PDF`, 404 y 401.

## 7. Frontend

- [x] 7.1 Crear `features/receivables/` (api, keys, hooks de query, utilidades) siguiendo el patrón de `features/sales`, con handlers MSW de prueba. Verificar con specs de API y hooks.
- [x] 7.2 Construir la pantalla `/receivables` (tabla, filtros de búsqueda y estado, badges MOROSO/AL_DÍA, tramos, paginación) y reemplazar `PlaceholderPage` en `router.tsx`. Verificar con spec de página (render, filtro, estado vacío) y que `router.spec.ts` sigue pasando.
- [x] 7.3 Agregar la pestaña "Cuenta Corriente" a `CustomerDetailPage` con resumen, alerta de límite excedido, tabla de facturas pendientes, ledger con saldo corrido, botón "Exportar PDF" y "Registrar Cobro" deshabilitado; quitar el banner del Sprint 9. Verificar con `CustomerDetailPage.spec.tsx` actualizado y sin violaciones de los roles existentes.

## 8. Cierre

- [x] 8.1 Escribir e2e `receivables-ledger.e2e-spec.ts` con el flujo completo: 3 ventas a crédito, una NC, consulta de ledger y PDF, invariante saldo = suma de movimientos. Verificar con `pnpm --filter backend test:e2e`.
- [x] 8.2 Actualizar `docs/domain_model.md` (nombres reales de los campos del movimiento y regla de saldo corrido) y correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores.
- [x] 8.3 Smoke manual: crear 3 ventas a crédito con `ArcaMockService`, abrir la cuenta corriente del cliente, verificar saldo, ledger y descargar el PDF. Sin datos fiscales reales.

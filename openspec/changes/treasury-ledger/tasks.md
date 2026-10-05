# Tasks

## 1. Shared types y migración

- [x] 1.1 Reemplazar `ITreasuryAccount`/`ITreasuryMovement`/`ICashRegister` incompatibles por `ITreasurySummary`, `ITreasuryMovement`, `ITreasuryMovementListResponse`, `ICreateTreasuryMovementPayload` y enum `TreasuryMovementType`. Verificar con build de `shared-types` y typecheck de backend y frontend.
- [x] 1.2 Migración `1700000000034-CreateTreasuryLedger`: tablas, CHECKs, índice, seed de las tres cuentas y trigger de inmutabilidad; `down` documentado. Spec de migración y `pnpm db:migrate`/`db:revert` solo en base local.

## 2. TreasuryService

- [x] 2.1 Tests que fallan primero: `accountForPaymentMethod` (todos los medios, CTA_CTE sin cuenta), `recordMovement`, `getSummary` (saldos derivados), `listMovements` (filtros y paginado), `createManual` (CHEQUES_CARTERA rechazado). Implementar entidades, servicio y funciones. Verificar que pasan.
- [x] 2.2 Controller `GET /treasury/summary`, `GET /treasury/movements`, `POST /treasury/movements` con guards ADMINISTRADOR, DTOs y test del controller. Verificar que pasan.

## 3. Movimientos automáticos

- [x] 3.1 Cobros: tests que fallan primero en `payments.service.spec.ts` (efectivo, transferencia, cheque) e integrar `recordMovement`. Verificar que pasan.
- [x] 3.2 Ventas de contado: tests (efectivo, banco, cheque, cuenta corriente sin movimiento) e integrar en `SalesService`. Verificar que pasan.
- [x] 3.3 Cheques: tests de depósito, endoso y rechazo (desde `EN_CARTERA` y `DEPOSITADO`) e integrar en `ChecksService.transition`. Verificar que pasan.

## 4. Frontend

- [x] 4.1 `features/treasury/`: api, hooks, validación del movimiento manual y tests. Verificar con vitest.
- [x] 4.2 Página `/treasury`: tarjetas de saldo, historial con filtros, modal de movimiento manual; reemplazar el placeholder del router. Tests de render, filtros y alta. Verificar con vitest.

## 5. Cierre

- [x] 5.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.

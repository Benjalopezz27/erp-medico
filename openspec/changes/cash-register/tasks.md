# Tasks

## 1. Shared types y migración

- [ ] 1.1 Tipos `ICashRegisterSession`, `ICashRegisterState`, payloads de apertura y cierre en `shared-types`. Verificar con build.
- [ ] 1.2 Migración `1700000000035-CreateCashRegisters` con CHECKs e índice único parcial; `db:migrate`/`db:revert` solo en base local.

## 2. Backend

- [ ] 2.1 Tests que fallan primero: apertura (ok y 409), estado (esperado, cerrada), cierre (sin diferencia, faltante con y sin observación, sobrante, sin caja abierta). Implementar `TreasuryService.listCashMovementsSince`, entidad, `CashRegisterService`, controller ADMIN y módulo. Verificar que pasan.

## 3. Frontend

- [ ] 3.1 `features/cash-register/` (api, hooks, validación) y tests. Verificar con vitest.
- [ ] 3.2 Página `/treasury/cash-register`, ruta, permiso y enlace desde `/treasury`. Tests de apertura, diferencia en vivo y cierre. Verificar con vitest.

## 4. Cierre

- [ ] 4.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.

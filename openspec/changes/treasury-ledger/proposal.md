# Proposal

## Why

Cobros, cheques y ventas de contado hoy no dejan rastro de tesorería: no hay forma de saber cuánta plata hay en efectivo, bancos y cheques en cartera. US-34 (issue #11) crea el libro de movimientos de tesorería y la vista consolidada. Es la base de la caja y el arqueo (US-33, change `cash-register`).

## What Changes

- Tablas `treasury_accounts` (tres cuentas fijas sembradas: `EFECTIVO`, `BANCOS`, `CHEQUES_CARTERA`) y `treasury_movements` (libro append-only: un trigger impide `UPDATE` y `DELETE`).
- Saldo de cada cuenta = suma de `INGRESO` menos `EGRESO`; no se guarda un saldo que pueda desfasarse.
- `TreasuryService.recordMovement(manager, ...)` reutilizable dentro de la transacción del llamador.
- Movimientos automáticos, en la misma transacción que el hecho que los origina:
  - Cobro `EFECTIVO` → ingreso en `EFECTIVO`; `TRANSFERENCIA` → ingreso en `BANCOS`; `CHEQUE` → ingreso en `CHEQUES_CARTERA`.
  - Venta de contado (no cuenta corriente): `EFECTIVO` → `EFECTIVO`; `TRANSFERENCIA`/`DEBITO`/`CREDITO`/`QR` → `BANCOS`; `CHEQUE` → `CHEQUES_CARTERA`.
  - Cheque depositado → egreso en `CHEQUES_CARTERA` e ingreso en `BANCOS`; endosado → egreso en `CHEQUES_CARTERA`; rechazado → egreso en la cuenta donde estaba (`CHEQUES_CARTERA` o `BANCOS` si ya estaba depositado).
- `GET /treasury/summary` (saldos por cuenta) y `GET /treasury/movements` (paginado, filtros por cuenta, tipo y fechas).
- `POST /treasury/movements`: movimiento manual de `INGRESO`/`EGRESO` con concepto, solo en `EFECTIVO` y `BANCOS`.
- Frontend `/treasury`: tres tarjetas de saldo, historial con filtros y modal de movimiento manual. Solo ADMINISTRADOR.
- Fuera de alcance: caja y arqueo (change `cash-register`), egresos automáticos por devoluciones o pagos a proveedores (se registran con movimiento manual), transferencias entre cuentas, backfill de cobros anteriores (no hay datos reales previos al Go-Live), saldos negativos bloqueados.

## Capabilities

### New Capabilities

- `treasury/treasury-ledger`: libro de movimientos, saldos por canal y movimientos manuales.

### Modified Capabilities

(ninguna)

## Impact

- Backend: `modules/treasury/` (hoy stub), `PaymentsService`, `ChecksService`, `SalesService` (una llamada en su transacción) y los módulos que importan `TreasuryModule`. Migración `1700000000034-*`.
- Shared types: reemplazar `ITreasuryAccount`/`ITreasuryMovement` (campos que no coinciden con el dominio) por contratos del resumen y movimientos.
- Frontend: `features/treasury/`, página `/treasury`.
- Zona sensible: no toca ARCA ni numeración fiscal. Una falla de tesorería revierte la operación de origen (misma transacción), por diseño.

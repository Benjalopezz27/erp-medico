# Design

## Context

- `TreasuryService.recordMovement(manager, …)` ya escribe en el libro dentro de la transacción del llamador; el saldo de `EFECTIVO` es derivado.
- `AuditService.record(manager, …)` es el log de auditoría del sistema.

## Goals / Non-Goals

**Goals**: un turno por fila, saldo esperado siempre derivado del libro, cierre atómico.
**Non-Goals**: multi-caja, conteo por denominación, reapertura.

## Decisions

1. **Saldo esperado derivado**: `opening + SUM(EFECTIVO desde openedAt)`; no se guarda hasta el cierre. Evita drift.
2. **Una sola caja abierta** con índice único parcial `((true)) WHERE closed_at IS NULL`; la violación `23505` se traduce a 409.
3. **Cierre en una transacción**: bloquea la fila del turno (`pessimistic_write`), calcula esperado, guarda cierre, registra el ajuste en el libro y audita. Si algo falla, la caja sigue abierta.
4. **Ajuste por diferencia** como movimiento `EFECTIVO` con `referenceType = 'CASH_REGISTER'` y `referenceId` del turno: el libro refleja el efectivo real y el siguiente turno parte consistente.
5. **Auditoría**: `AuditAction.UPDATE` sobre `CashRegister` con valores previos/nuevos. El turno cerrado no tiene endpoints de edición.
6. **Consulta de movimientos del turno** en `TreasuryService.listCashMovementsSince(since)` (dueño del libro); el módulo de caja no toca la tabla de movimientos.

## Risks / Trade-offs

- Un movimiento de efectivo registrado entre el cálculo del esperado y el commit del cierre no entra en el arqueo (ventana de milisegundos, puesto único). Ponytail: bloquear la cuenta si hiciera falta.
- Los movimientos de efectivo anteriores a la primera apertura no cuentan: el saldo inicial lo declara el administrador.

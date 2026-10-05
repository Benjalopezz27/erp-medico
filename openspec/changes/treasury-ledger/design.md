# Design

## Context

- `TreasuryModule` es un stub. `PaymentsService.create`, `ChecksService.transition` y `SalesService` ya operan en una única transacción con `EntityManager`; el ledger de cuenta corriente (`receivables`) sigue el mismo patrón (métodos que reciben `manager`).
- `shared-types` define `ITreasuryAccount`/`ITreasuryMovement` con `number` y campos que no coinciden con el dominio; ninguna entidad los usa.
- Política decimal: montos `numeric(14,2)` y `string` en la API (`docs/decimal_policy.md`).

## Goals / Non-Goals

**Goals**

- Un libro único y confiable; saldos siempre derivados.
- Los llamadores solo agregan una línea dentro de su transacción.

**Non-Goals**

- Caja/arqueo, conciliación bancaria, egresos automáticos, backfill.

## Decisions

1. **Saldo derivado, sin columna `currentBalance`.** `SUM(CASE type ...)` por cuenta. Evita drift y locks sobre un saldo; el volumen de un puesto único lo permite. Alternativa descartada: saldo almacenado con `SELECT FOR UPDATE` (más piezas, mismo resultado).
2. **Inmutabilidad en la base**: trigger `BEFORE UPDATE OR DELETE` que lanza excepción. Un bug de aplicación no puede reescribir el libro.
3. **`recordMovement(manager, input)`** en `TreasuryService`, sin transacción propia. Las cuentas se resuelven por `account_type` (único); un `Map` en memoria no hace falta, es un `findOne` por llamada.
4. **Tablas separadas de cuenta y movimiento** aunque las cuentas sean tres fijas: respeta el modelo de dominio y permite sumar cuentas bancarias luego sin migrar movimientos.
5. **Mapeo medio de pago → cuenta** en una función pura `accountForPaymentMethod` (testeada), compartida por cobros y ventas. Cheque en venta no tiene entidad `Check`; se cuenta en cartera igual.
6. **Movimiento manual** limitado a `EFECTIVO` y `BANCOS` en el DTO (`IsIn`). Egresos que dejarían saldo negativo se permiten; el arqueo detecta el desvío.

## Risks / Trade-offs

- Acoplamiento: `Payments`, `Checks` y `Sales` dependen de `TreasuryModule`. Es una dependencia en un solo sentido (Treasury no importa a nadie del dominio).
- Devoluciones y pagos a proveedores no generan egreso: se cargan como movimiento manual hasta un cambio posterior. Declarado en el proposal.
- La suma por cuenta crece con el tiempo; índice `(treasury_account_id, created_at)` y, si hace falta, snapshot periódico (ponytail).

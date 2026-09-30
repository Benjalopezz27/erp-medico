# Proposal

## Why

El ledger de cuenta corriente (`receivables-ledger`, US-29) ya registra FACTURA y NOTA_CREDITO, pero no hay forma de cobrar: el botón "Registrar Cobro" está deshabilitado y las facturas nunca bajan de saldo. US-30 (Sprint 9, issue #10) agrega el cobro con aplicación a facturas y el recibo formal. Es el segundo de tres cambios de la issue; cheques (US-31) y reversión (US-32) dependen de este.

## What Changes

- Nuevo `POST /payments`: registra un cobro de un cliente con medio `EFECTIVO` o `TRANSFERENCIA` y lo aplica a facturas con saldo, en una sola transacción. Dos modos: **dirigido** (el cliente indica monto por factura) y **por antigüedad** (el sistema cancela desde la factura más vieja hasta agotar el monto).
- Cada aplicación escribe un movimiento `PAGO` (−) en el ledger, actualiza `currentBalance` y el estado de la factura (PARCIAL / CANCELADO).
- Cada cobro emite un recibo con numeración correlativa `0001-NNNNNNNN`.
- Nuevo `GET /receipts/:id` y `GET /receipts/:id/pdf` (recibo A4, pdf-lib, generación síncrona).
- Tablas nuevas: `payments`, `payment_allocations`, `receipts` + secuencia de numeración.
- Frontend: formulario de cobro `/payments/new` (wireframe 27), vista de recibo `/receipts/:id` (wireframe 28), habilitar "Registrar Cobro" en la pestaña Cuenta Corriente.
- Fuera de alcance: medio CHEQUE y su ciclo de vida (US-31), reversión por rechazo (US-32), cobros con varios medios en un mismo recibo, saldo a favor / pago mayor a la deuda, anulación de cobros, tesorería (caja/bancos, Sprint 10), intereses.

## Capabilities

### New Capabilities

- `receivables/payment-collection`: registro atómico de cobros con aplicación dirigida o por antigüedad y movimiento PAGO en el ledger.
- `receivables/receipts`: emisión, numeración, consulta y PDF del recibo de cada cobro.

### Modified Capabilities

(ninguna — `openspec/specs/` sigue vacío; el ledger vive en el change `receivables-ledger`)

## Impact

- Backend: `apps/backend/src/modules/payments/` (hoy solo stub `status`): entidades, DTOs, service, controller con guards, servicio de PDF; `ReceivablesService` gana método de aplicación de pago; migración `1700000000030-*`.
- Shared types: `packages/shared-types/src/models/receivables.model.ts` — `IPayment`, `IPaymentAllocation`, `IReceipt` pasan a montos `string` y se alinean con las entidades; tipos de request/response.
- Frontend: `apps/frontend/src/features/payments/` (nuevo), `router.tsx` (rutas), pestaña de `CustomerDetailPage`.
- Docs: `docs/domain_model.md` (Payment/Receipt/PaymentAllocation reales).
- Sin dependencias nuevas.

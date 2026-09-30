# Proposal

## Why

`payments-receipts` (US-30) cobra solo en efectivo o transferencia y rechaza `CHEQUE` con 400. La distribuidora cobra con cheques de terceros: hay que registrarlos, seguirlos (cartera, depósito, endoso) y, si el banco los rechaza, reabrir la deuda del cliente sin dejar saldos inconsistentes. US-31 y US-32 (Sprint 9, issue #10) cierran ese circuito. Es el tercer y último cambio de la issue, después de `receivables-ledger` (US-29) y `payments-receipts` (US-30), ya mergeados en `dev`.

## What Changes

- `POST /payments` acepta `paymentMethod = CHEQUE` con los datos de **un** cheque (banco, número, librador, fecha de vencimiento, fecha de emisión opcional). Crea `Check` en estado `RECIBIDO` dentro de la misma transacción del cobro. Un medio y un cheque por cobro.
- Nuevas transiciones, solo ADMINISTRADOR: `PATCH /checks/:id/to-cartera` (RECIBIDO → EN_CARTERA), `/deposit` (EN_CARTERA → DEPOSITADO), `/endorse` (EN_CARTERA → ENDOSADO, con `supplierId`). Cualquier otra transición da 409.
- `PATCH /checks/:id/reject` (EN_CARTERA o DEPOSITADO → RECHAZADO) en una transacción atómica: marca el cheque, repone el saldo de cada factura por el monto **realmente aplicado** por ese cobro, escribe un movimiento `REVERSION_CHEQUE` (+) por factura, marca el cobro `REVERTIDO` y registra auditoría.
- `GET /checks` (filtros por estado y vencimiento, paginado, contador de cheques que vencen en 7 días) y `GET /checks/:id` (incluye el impacto previsto de un rechazo).
- `Payment` gana `status` (`REGISTRADO` | `REVERTIDO`). El recibo de un cobro revertido sigue existiendo y muestra la marca de revertido.
- Frontend: opción "Cheque" con sus campos en `/payments/new` (wireframe 27); página `/treasury/checks` (wireframe 29) con filtros, badge de vencimiento a 7 días y acciones por estado; modal de rechazo que muestra facturas que se reabren y saldo que sube; el recibo muestra banco y número del cheque.
- Tabla nueva `checks`, columna `payments.status`. Sin dependencias nuevas.
- Fuera de alcance: rechazo de cheque `ENDOSADO`, cobros multi-medio, cheques propios/emitidos, asientos de tesorería (Sprint 10), cuenta a pagar del proveedor por el endoso, re-presentación de un cheque rechazado, anulación de recibos.

## Capabilities

### New Capabilities

- `receivables/check-payment`: cobro con cheque; creación del `Check` RECIBIDO y su dato en el recibo.
- `receivables/check-lifecycle`: listado, detalle y transiciones de estado del cheque.
- `receivables/check-rejection-reversal`: rechazo atómico con reversión de la aplicación del cobro en el ledger.

### Modified Capabilities

(ninguna — `openspec/specs/` sigue vacío; el cambio `payments-receipts` se archivará por separado y este delta no lo modifica en sitio)

## Impact

- Backend: `modules/checks/` (hoy stub `status`): entidad, DTOs, service, controller con guards; `ChecksModule` importa `ReceivablesModule` y `AuditModule`. `PaymentsService.register` y `RegisterPaymentDto` aceptan CHEQUE; `Payment` entity y `ReceiptsService`/`ReceiptPdfService` muestran el cheque y el estado. `ReceivablesService.reversePayment` (nuevo, mismo lugar donde vive `applyPayment`). Migración `1700000000031-*`.
- Shared types: `ICheck` se realinea con `docs/domain_model.md` (montos `string`, `dueDate`, `drawerName`); tipos de request/response, `PaymentStatus`, códigos de error de cheque.
- Frontend: `features/checks/` (nuevo), `features/payments/` y `PaymentFormPage`, `ReceiptPage`, `router.tsx`, permisos de ruta, navegación de Tesorería.
- Docs: `docs/domain_model.md` (`Check` real, `Payment.status`, invariante), `docs/sprint_plan.md` no cambia.
- Sin tocar ARCA, numeración fiscal ni `decimal_policy` (se reutiliza `Decimal`).

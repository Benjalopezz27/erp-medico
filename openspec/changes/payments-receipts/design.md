# Design

## Context

- El ledger (`receivables-ledger`) deja `AccountReceivable` (saldo por venta a crédito, `numeric(14,2)`) y `AccountReceivableMovement` con `movementType` sin CHECK, listo para `PAGO`. `ReceivablesService` muta dentro de transacciones con `manager` y lock pesimista (patrón de `recordCreditNoteCompensation`).
- `PaymentsModule` es un stub (`GET /payments/status`), sin entidades ni guards. `ReceivablesModule` exporta `ReceivablesService` y `TypeOrmModule`.
- `packages/shared-types` ya define `IPayment`, `IPaymentAllocation`, `IReceipt` con montos `number` y campos que no coinciden con `docs/domain_model.md`; ninguna entidad los implementa todavía.
- El PDF de resumen de cuenta (`AccountStatementPdfService`, pdf-lib, síncrono) es el patrón a seguir; el frontend descarga blobs con el patrón de `features/receivables`.
- Wireframes 27 y 28 muestran cobro con varios medios y cheque; este cambio cubre un medio por cobro y sin cheque (ver proposal, fuera de alcance).

## Goals / Non-Goals

**Goals**

- Cobro atómico con dos modos de aplicación, movimientos `PAGO` correctos y recibo numerado.
- Dejar `Payment.paymentMethod` y la relación con `Receipt` listos para que US-31 agregue `CHEQUE` sin migrar lo existente.

**Non-Goals**

- Cheques, reversión, saldo a favor, anulación de cobros, multi-medio, asiento en tesorería.

## Decisions

**D1 — Un `Payment` por cobro, un `Receipt` por `Payment`.** `payments(id, payment_number?, customer_id, total_amount, payment_method, notes, user_id, created_at)`, `receipts(id, receipt_number unique, payment_id unique, customer_id, total_amount, user_id, created_at)`, `payment_allocations(id, payment_id, account_receivable_id, amount_allocated, allocation_type)` con `CHECK amount > 0` y `UNIQUE(payment_id, account_receivable_id)`. Se descarta `payment_number` (el recibo ya es el número visible). `allocation_type` es `DIRECTED | GLOBAL_AGE`, según `domain_model.md`.
Alternativa descartada: multi-medio en un recibo (N payments por receipt). Exige repartir aplicaciones entre medios y no lo pide el criterio de aceptación; `receipts.payment_id` pasa a no-unique si se habilita luego.

**D2 — Un solo endpoint con unión discriminada.** `POST /payments` recibe `{ customerId, paymentMethod, notes?, mode: 'DIRECTED', allocations: [...] }` o `{ ..., mode: 'GLOBAL_AGE', totalAmount }`. El modo por antigüedad se resuelve en el servidor (una sola fuente de verdad de la cascada); el frontend solo previsualiza para llenar los inputs.

**D3 — La aplicación vive en `ReceivablesService.applyPayment`.** Recibe el `manager`, bloquea las cuentas con `pessimistic_write` (ordenadas por id para evitar deadlocks), valida pertenencia y saldo, y por cada asignación actualiza saldo/estado y escribe el movimiento `PAGO` (`previous`, `subsequent`, `userId`, `paymentId`). `PaymentsService` orquesta: valida cliente, crea `Payment`, llama a `applyPayment`, crea `Receipt`. Es el mismo lugar donde ya se escribe el ledger, y US-32 podrá revertir con el mismo servicio.
Requiere columna `payment_id` nullable en `account_receivable_movements` (FK a `payments`) para trazar cada `PAGO` con su cobro (también lo necesitará US-32).

**D4 — Por antigüedad: orden `created_at ASC, id ASC` sobre cuentas con `current_balance > 0`.** Se bloquean todas las candidatas y se recorre con `Decimal`; se corta al agotar el monto. Monto mayor al saldo total del cliente = 409, no se guarda saldo a favor.

**D5 — Numeración con secuencia PostgreSQL.** `CREATE SEQUENCE receipt_number_seq` y `nextval` dentro de la transacción formatea `0001-` + 8 dígitos. Una secuencia no es transaccional: un rollback deja un hueco. Los recibos formales no deben tener huecos, así que se usa **tabla contador con `SELECT ... FOR UPDATE`** (`receipt_counters(point_of_sale int pk, last_number int)`, fila `1 → 0` sembrada por la migración). El lock serializa cobros solo en el momento de emitir el recibo (último paso de la transacción) y un rollback devuelve el número.
Alternativa descartada: secuencia (huecos); `MAX(number)+1` (carrera).

**D6 — Importes.** Todo en `Decimal`/`numeric`, strings de 2 decimales (`docs/decimal_policy.md`). Redondeo `ROUND_HALF_UP` solo al normalizar la entrada a 2 decimales; montos con más de 2 decimales se rechazan con 400 (no se redondean en silencio).

**D7 — Errores.** 404 cliente inexistente; 400 DTO inválido, factura de otro cliente, duplicada, medio no soportado; 409 monto mayor al saldo de una factura o al saldo total, y saldo insuficiente por concurrencia. Código de error estable en el cuerpo (`PAYMENT_AMOUNT_EXCEEDS_BALANCE`, etc.) en shared-types.

**D8 — Recibo PDF síncrono con `ReceiptPdfService`** (pdf-lib, A4): encabezado con datos del emisor tomados de la configuración existente si está disponible, si no, texto de la razón social del sistema; total en letras con una función pura con test. No se persiste el PDF (se regenera desde datos inmutables).
Techo conocido: mismo recibo se regenera en cada descarga; si cambian los datos del cliente cambia el PDF. Aceptable hasta que se pida inmutabilidad fiscal.

**D9 — Roles.** `JwtAuthGuard + RolesGuard`, ADMINISTRADOR y VENDEDOR, como el resto de cuenta corriente (wireframes 27/28).

**D10 — Frontend.** `features/payments/` (api, keys, hooks, componentes, utilidades) con patrón de `features/receivables`. Formulario React Hook Form + zod como el resto del proyecto. En modo antigüedad la cascada se calcula en cliente solo para mostrar; el servidor recalcula. `/payments/new?customerId=` y `/receipts/:id` en `router.tsx`.

## Risks / Trade-offs

- [Contador serializa cobros] → Solo dura hasta el commit; volumen de una distribuidora lo tolera. Ver D5.
- [Sin saldo a favor: cliente paga de más] → 409 con mensaje claro; queda como mejora si el cliente lo pide.
- [NC posterior a cobro parcial falla con `SALE_RETURN_RECEIVABLE_INCONSISTENCY`] → Ya decidido en `receivables-ledger`; se hace visible acá y no se resuelve.
- [Recibo sin datos fiscales del emisor configurados] → Si falta configuración se imprime un texto por defecto; no bloquea el cobro.
- [Contrato `IPayment` cambia de `number` a `string`] → Nadie lo consume aún (verificar con typecheck de backend y frontend).

## Migration Plan

1. Migración `1700000000030`: tablas `payments`, `payment_allocations`, `receipts`, `receipt_counters` (con fila sembrada) y columna `payment_id` en `account_receivable_movements`. Solo agrega; no toca datos existentes.
2. `pnpm db:migrate` y `pnpm db:revert` solo en local; staging/producción los aplica una persona con backup previo.
3. Rollback: `down` elimina lo creado. Solo válido antes de que existan cobros reales.

## Open Questions

- Punto de venta del recibo: se fija `0001`. ¿El cliente usa otro? Cambiar es tocar la fila sembrada.
- ¿VENDEDOR debe poder cobrar o solo ADMINISTRADOR? Wireframe 27 dice ambos; se sigue eso.

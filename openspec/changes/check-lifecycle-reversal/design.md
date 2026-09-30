# Design

## Context

- `payments-receipts` dejó `Payment` (un medio, un recibo), `PaymentAllocation` (monto aplicado por factura, único por cobro y cuenta) y `account_receivable_movements.payment_id`. `ReceivablesService.applyPayment` es el único lugar que muta saldos por cobro; su diseño (D3) previó que US-32 revierta con el mismo servicio.
- `PaymentsService.register` hoy rechaza `CHEQUE` con `PAYMENT_METHOD_NOT_SUPPORTED`. `ChecksModule` es un stub (`GET /checks/status`).
- `ICheck` en shared-types difiere de `docs/domain_model.md` (monto `number`, `paymentDate`, `issuerCuit`); ninguna entidad lo implementa, así que se realinea sin migrar datos.
- `AuditService.record(manager, ...)` escribe auditoría dentro de la transacción; `AuditAction` solo tiene CREATE/UPDATE/…; se usa `UPDATE` con `entityName` `Check` / `Payment`.
- El enum del ledger ya es `REVERSION_CHEQUE` en código (el doc `domain_model.md` §enum dice `REVERSIÓN_CHEQUE`; se corrige el doc).
- Decisiones ya tomadas con el dueño: rechazo solo desde EN_CARTERA y DEPOSITADO (son las 5 transiciones del DoD); un medio por cobro.

## Goals / Non-Goals

**Goals**

- Cobro con cheque atómico y cheque trazable a su cobro.
- Cinco transiciones válidas y todo el resto rechazado, también bajo concurrencia.
- Rechazo que restaura saldos exactos y deja el ledger consistente (invariante §4.2 del modelo de dominio).

**Non-Goals**

- Rechazo de ENDOSADO, multi-medio, cheques propios, tesorería, cuenta a pagar del proveedor, re-presentación, anulación de recibos.

## Decisions

**D1 — Tabla `checks` ligada al cobro.** `checks(id, payment_id unique, customer_id, bank_name, check_number, drawer_name, amount numeric(14,2), issue_date date null, due_date date, received_date date default current_date, status varchar(20), endorsed_to_supplier_id uuid null, rejected_at timestamptz null, rejection_reason varchar(500) null, updated_at)`. `UNIQUE(bank_name, check_number)`, `CHECK amount > 0`, FK `payment_id`/`customer_id`/`endorsed_to_supplier_id` RESTRICT, índices por `status` y `due_date`. Se descarta `reversal_payment_id` del modelo de dominio: la reversión no crea un cobro nuevo, el vínculo es el `payment_id` original y la auditoría.
Techo conocido: `UNIQUE(bank, número)` impide re-presentar un cheque rechazado; aceptable hasta que se pida.

**D2 — `CHEQUE` entra por el mismo `POST /payments`.** El DTO gana `check?: { bankName, checkNumber, drawerName, dueDate, issueDate? }`; se valida con `ValidateIf` según `paymentMethod`. `PaymentsService` crea el `Check` dentro de la transacción después de calcular el total (monto del cheque = total aplicado). `SUPPORTED_METHODS` suma `CHEQUE`. Un `23505` por el índice único se traduce a 409 `CHECK_DUPLICATE`.

**D3 — Máquina de estados como tabla en el servicio.** `TRANSITIONS = { to-cartera: [RECIBIDO → EN_CARTERA], deposit: [EN_CARTERA → DEPOSITADO], endorse: [EN_CARTERA → ENDOSADO], reject: [EN_CARTERA|DEPOSITADO → RECHAZADO] }`. Un único método privado `transition(manager, id, action, userId, mutate)` hace `findOne` con `pessimistic_write`, valida el estado, aplica y audita. Bloquear la fila serializa transiciones concurrentes; el perdedor ve el estado nuevo y recibe 409.

**D4 — Reversión en `ReceivablesService.reversePayment(manager, { paymentId, userId })`.** Exige transacción activa; carga las `PaymentAllocation` del cobro, bloquea las cuentas `pessimistic_write` ordenadas por id (mismo orden que `applyPayment`, evita deadlock), y por cada una: `next = current + amountAllocated`, estado `PENDIENTE` si `next == originalAmount`, si no `PARCIAL` (nunca `CANCELADO`), y un movimiento `REVERSION_CHEQUE` con `previous`/`subsequent`, `paymentId`, `userId`. Se repone el monto aplicado, **no** `originalAmount` (el plan original de sprint decía `originalAmount`, lo que borraría pagos previos o notas de crédito legítimas). Si `next > originalAmount` lanza error de inconsistencia (mismo criterio que `SALE_RETURN_RECEIVABLE_INCONSISTENCY`). Idempotencia: el cheque bloqueado y el cambio de estado impiden una segunda reversión del mismo cobro.

**D5 — `ChecksService.reject` orquesta.** En una `dataSource.transaction`: bloquea el cheque, valida estado, `reversePayment`, cheque → `RECHAZADO` (+ `rejectedAt`, `rejectionReason`), `Payment.status → REVERTIDO`, dos `audit.record` (Check y Payment, con valores previos y nuevos). `ChecksModule` importa `ReceivablesModule` y `AuditModule`; `PaymentsModule` solo registra la entidad `Check` en `forFeature` (sin dependencia cíclica entre módulos).

**D6 — `Payment.status`.** Columna `status varchar(20) NOT NULL DEFAULT 'REGISTRADO'` con `CHECK IN ('REGISTRADO','REVERTIDO')`; los cobros existentes quedan REGISTRADO. Enum `PaymentStatus` en shared-types. El recibo no se anula ni se renumera (formal y correlativo); el detalle y el PDF exponen `paymentStatus`.

**D7 — Impacto previsto en `GET /checks/:id`.** Campo `rejectionImpact` (solo EN_CARTERA/DEPOSITADO): por cada `PaymentAllocation`, `{ accountReceivableId, documentReference, amountToRestore, resultingBalance, resultingStatus }` y `totalIncrease`. Se calcula con la misma función pura que usa `reversePayment` (una sola fuente de verdad), sin bloquear. El modal del frontend solo lo muestra.

**D8 — Roles.** `/checks/*` solo ADMINISTRADOR (wireframe 29). `POST /payments` mantiene ADMINISTRADOR y VENDEDOR: un vendedor puede recibir el cheque, no moverlo.

**D9 — Listado.** `GET /checks?status&dueFrom&dueTo&page&limit`, orden `due_date ASC, id`. `dueSoonCount` = cheques `RECIBIDO`/`EN_CARTERA` con `due_date` entre hoy y hoy + 7 días, calculado en la misma consulta con `CURRENT_DATE` de la base (evita desfase de zona horaria del servidor de aplicación).

**D10 — Importes y errores.** `Decimal`/`numeric`, strings de 2 decimales (`docs/decimal_policy.md`). Códigos estables en shared-types: `CHECK_DATA_INVALID` (400), `CHECK_DUPLICATE` (409), `CHECK_INVALID_TRANSITION` (409), `CHECK_REVERSAL_INCONSISTENCY` (409); 404 para cheque o proveedor inexistente.

**D11 — Frontend.** `features/checks/` (api, keys, hooks, componentes, utilidades) con el patrón de `features/receivables` y `features/payments`. `PaymentFormPage` muestra los campos de cheque al elegir "Cheque" y arma `check.amount` implícito (= total aplicado). `/treasury/checks` como ruta nueva bajo Tesorería (`/treasury` sigue siendo el placeholder de Sprint 10), permiso solo ADMINISTRADOR, enlace en navegación. Modal de rechazo con `AlertDialog` ya usado en el proyecto.

## Risks / Trade-offs

- [Rechazo con NC posterior al cobro] → si `next > originalAmount`, se aborta con `CHECK_REVERSAL_INCONSISTENCY`; queda para revisión manual, consistente con lo ya decidido en `receivables-ledger`.
- [Bloqueo de muchas cuentas en un rechazo] → una distribuidora aplica a pocas facturas por cobro; orden por id evita deadlock.
- [Sin rechazo desde ENDOSADO] → un cheque endosado que rebota no se puede revertir en el sistema; se documenta como deuda conocida y se agrega a `docs/DEBT.md`.
- [Recibo de cobro revertido sigue vigente] → se marca pero no se anula; anulación formal queda fuera de alcance.

## Migration Plan

1. Migración `1700000000031`: crea `checks` y agrega `payments.status`. Solo agrega; no toca datos.
2. `pnpm db:migrate` / `pnpm db:revert` solo en local; staging y producción los aplica una persona con backup previo.
3. Rollback: `down` elimina `checks` y la columna. Válido antes de que existan cheques reales.

## Open Questions

- ¿Se cobra "Mover a Cartera" manualmente (como en el wireframe) o automáticamente al registrar el cobro? Se sigue el wireframe: manual.
- ¿El proveedor del endoso debe estar activo? Se exige solo que exista.

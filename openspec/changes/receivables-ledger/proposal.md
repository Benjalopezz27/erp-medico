# Proposal

## Why

La cuenta corriente de clientes existe solo como dato interno: `AccountReceivable` guarda el saldo por venta a crédito y `AccountReceivableMovement` registra únicamente las notas de crédito. No hay movimiento de factura (+), no hay endpoint para consultar el estado de cuenta y `/receivables` en el frontend es un placeholder. Sin un ledger completo y consultable no se pueden implementar cobranzas (US-30) ni reversión de cheques (US-32), que dependen de él. US-29 (Sprint 9, issue #10) es el primer cambio de tres de esa issue.

## What Changes

- `recordCreditSaleDebt` escribe un movimiento `FACTURA` (+) con `previousBalance = 0` y `subsequentBalance = total`, y recibe `userId` (el de la venta). Una migración inserta el movimiento faltante para las cuentas a crédito ya existentes.
- Nuevo endpoint `GET /customers/:id/account-receivable`: resumen del cliente (saldo total, facturas PENDIENTE/PARCIAL, límite de crédito, antigüedad 0-30 / 31-60 / +60 días) y ledger paginado en orden cronológico con saldo corrido.
- Nuevo endpoint `GET /receivables`: lista global por cliente (facturas pendientes, saldo total, deuda más antigua, estado MOROSO / AL DÍA) con filtros y paginación.
- Nuevo endpoint `GET /customers/:id/account-receivable/pdf`: Resumen de Cuenta en PDF (pdf-lib, generación síncrona).
- Guards `JwtAuthGuard` + `RolesGuard` (ADMINISTRADOR y VENDEDOR) en el controller de receivables, que hoy no tiene ninguno.
- Frontend: pantalla `/receivables` (lista global con antigüedad) y pestaña "Cuenta Corriente" en `CustomerDetailPage` que reemplaza el banner "llega en Sprint 9". El botón "Registrar Cobro" aparece deshabilitado hasta el cambio `payments-receipts`.
- Límite de crédito: solo se muestra con alerta visual si el saldo lo excede. No bloquea ventas.
- Fuera de alcance: cobros, recibos, cheques, tesorería, intereses, notas de débito, saldo a favor, rango de fechas en el PDF, bloqueo de ventas por límite de crédito.

## Capabilities

### New Capabilities

- `receivables/customer-ledger`: el ledger de cuenta corriente registra un movimiento FACTURA por cada venta a crédito y expone el estado de cuenta de un cliente (resumen, antigüedad, movimientos con saldo corrido).
- `receivables/receivables-overview`: listado global de deudores por cliente con saldo, deuda más antigua y estado MOROSO / AL DÍA.
- `receivables/account-statement-pdf`: exportación del Resumen de Cuenta de un cliente en PDF.

### Modified Capabilities

(ninguna — `openspec/specs/` está vacío; el comportamiento actual de NOTA_CREDITO vive solo en código)

## Impact

- Backend: `apps/backend/src/modules/receivables/` (service, controller con guards, DTOs, query service, template de PDF), `apps/backend/src/modules/sales/sales.service.ts` (pasar `userId` a `recordCreditSaleDebt`), migración nueva `1700000000029-*` (índice único de FACTURA por cuenta, backfill).
- Sin cambios de contrato en ventas ni devoluciones; `recordCreditNoteCompensation` no se toca.
- Shared types: `packages/shared-types/src/models/receivables.model.ts` — corregir `IAccountReceivableMovement` (montos `string`, sin `receiptId`) y agregar tipos de respuesta.
- Frontend: `apps/frontend/src/features/receivables/` (nuevo), `router.tsx` (reemplaza placeholder `/receivables`), `CustomerDetailPage.tsx` (pestaña).
- Docs: `docs/domain_model.md` (nombres reales de campos del movimiento) al cerrar el cambio.
- Sin dependencias nuevas.

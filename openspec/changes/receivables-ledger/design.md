# Design

## Context

- `AccountReceivable` (`account_receivables`) guarda una fila por venta a crédito con `originalAmount` / `currentBalance` (`numeric(14,2)`, string en TypeScript) y estado PENDIENTE / PARCIAL / CANCELADO. `dueDate` es siempre `null`.
- `AccountReceivableMovement` (`account_receivable_movements`) tiene `previousBalance` / `subsequentBalance` por cuenta, `userId NOT NULL`, `CHECK amount > 0` y `movement_type varchar(50)` sin CHECK (migración `1700000000025`). Hoy solo se escriben movimientos `NOTA_CREDITO` (`ReceivablesService.recordCreditNoteCompensation`).
- `recordCreditSaleDebt` (`receivables.service.ts:18`) crea la cuenta pero no el movimiento `FACTURA`; se llama solo desde `sales.service.ts:201`, dentro de la transacción de la venta, que ya dispone de `sale.userId`.
- `ReceivablesController` solo tiene `GET /receivables/status`, sin guards. `CustomersController` usa `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMINISTRADOR, VENDEDOR)` a nivel de clase.
- El PDF fiscal usa `pdf-lib` (`FiscalPdfTemplateService`, `sales/services/fiscal-pdf-template.service.ts`) dentro de un job BullMQ porque se persiste. El frontend descarga blobs con `useDownloadFiscalDocumentPdf` (`features/sales/hooks/use-fiscal-document-artifact.ts`).
- No existe helper compartido de decimales ni de paginación genérica; cada módulo usa `decimal.js` directo y meta de paginación propia.
- Frontend: `/receivables` es `PlaceholderPage` (`router.tsx:750`); `CustomerDetailPage` tiene un banner de "Cta Cte en Sprint 9".

## Goals / Non-Goals

**Goals**

- Ledger completo (FACTURA + NOTA_CREDITO ya existente) consultable por cliente, con saldo corrido correcto y paginable.
- Vista global de deudores y PDF de resumen.
- Dejar el ledger listo para que `payments-receipts` agregue `PAGO` y `checks-lifecycle-reversal` agregue `REVERSION_CHEQUE` sin cambios de esquema en `movement_type`.

**Non-Goals**

- Cobros, recibos, cheques, tesorería.
- Bloquear ventas por límite de crédito, intereses, notas de débito, saldo a favor.
- Fecha de vencimiento (`dueDate`) y rango de fechas en el PDF.
- Cambiar `recordCreditNoteCompensation` ni el bloqueo de NC mayor al saldo.

## Decisions

**D1 — FACTURA se escribe en `recordCreditSaleDebt`.** La firma agrega `userId` (viene de `sale.userId`) y el método inserta el movimiento después de crear la cuenta. Es el único punto de creación de cuentas, así que el ledger queda completo por construcción.
Alternativa descartada: derivar FACTURA de `account_receivables` en cada consulta (UNION). Duplica la lógica de signos y rompe la invariante "el ledger es solo movimientos".

**D2 — Backfill por migración idempotente + índice único parcial.** Migración `1700000000029`:

1. Crea `UQ_arm_factura_per_ar` sobre `(account_receivable_id) WHERE movement_type = 'FACTURA'`.
2. Inserta un `FACTURA` por cada cuenta que no lo tenga: `amount = original_amount`, `previous_balance = 0`, `subsequent_balance = original_amount`, `user_id` = `sales.user_id`, `created_at` = `account_receivables.created_at`, `fiscal_document_id` = el de la cuenta (`INSERT ... SELECT ... WHERE NOT EXISTS`).
   `down`: borra los `FACTURA` y el índice (solo válido en local; el rollback en un entorno con datos posteriores pierde esos movimientos, por lo que se documenta como irreversible en staging/producción).
   Caso borde: una venta a crédito con total 0 violaría `CHECK amount > 0`; el CHECK de contrato de ventas exige factura y las ventas tienen total > 0, así que el backfill filtra `original_amount > 0` y el servicio lanza error si `totalGross` es 0 en vez de silenciarlo.

**D3 — Saldo corrido por ventana SQL sobre todos los movimientos del cliente.** Una consulta con `SUM(signed_amount) OVER (ORDER BY created_at, type_rank, id)` sobre los movimientos unidos a `account_receivables` del cliente, y luego `LIMIT/OFFSET` sobre esa subconsulta. Así la página 2 trae el acumulado real. `signed_amount = CASE movement_type WHEN 'FACTURA' THEN amount WHEN 'REVERSION_CHEQUE' THEN amount ELSE -amount END`. `type_rank` pone `FACTURA` primero ante empates de `created_at` (dos filas de una misma transacción comparten `now()`). Todo el cálculo es en `numeric` de PostgreSQL; no hay aritmética `number` en JS (`docs/decimal_policy.md`).
Alternativa descartada: encadenar `previousBalance` / `subsequentBalance` de cada movimiento — son por cuenta, no por cliente, y no dan saldo corrido del cliente.

**D4 — Consultas en un `ReceivablesQueryService` separado del de escritura.** `ReceivablesService` sigue siendo el que muta dentro de transacciones; el nuevo servicio solo lee (resumen, ledger, lista global, datos del PDF). Evita mezclar guardas de transacción con lecturas y mantiene chico cada archivo.

**D5 — Antigüedad desde `account_receivables.created_at`.** `dueDate` no existe en la práctica. Días = fecha actual menos fecha de creación, ambas en `America/Argentina/Buenos_Aires`, para que "hoy" no cambie a las 21:00 locales por usar UTC. Tramos 0-30, 31-60, +60 sobre `current_balance` de cuentas con estado PENDIENTE / PARCIAL. MOROSO = deuda más antigua > 30 días, constante en el servicio (sin configuración).

**D6 — Lista global agrupada por cliente.** Sigue el wireframe 26 (una fila por cliente), no una fila por factura. `GET /receivables?search=&status=&page=&limit=`. Los filtros por estado se aplican con `HAVING` para que el total de la paginación sea correcto.

**D7 — Rutas.** `GET /customers/:id/account-receivable` y `/pdf` viven en un controller propio del módulo receivables (`@Controller('customers')`, un `CustomerAccountController`) y no en `CustomersController`, para no acoplar `customers` a `receivables`. No hay conflicto con `GET /customers/:id` (distinta cantidad de segmentos). `ReceivablesController` agrega `GET /receivables` con guards a nivel de método (ADMINISTRADOR y VENDEDOR); `GET /receivables/status` se mantiene sin autenticación, como hasta ahora.

**D8 — PDF síncrono con `pdf-lib`, template propio.** El resumen se genera al pedirlo y no se persiste: cambia con cada movimiento, así que no tiene sentido cachearlo ni encolarlo (a diferencia del PDF fiscal). Un `AccountStatementPdfService` arma A4 con paginación manual (encabezado repetido, filas de altura fija). No reutiliza `FiscalPdfTemplateService`, porque su layout es fiscal y su firma está atada a `FiscalDocument`.
Techo conocido: se imprimen todos los movimientos sin filtro de fechas; un cliente con miles de movimientos genera un PDF grande. Si pasa, agregar `from`/`to`.

**D9 — Límite de crédito solo informativo.** `creditLimit = 0` se interpreta como "sin límite configurado" (es el default de la columna y VENDEDOR no puede fijarlo mayor a 0). `exceedsCreditLimit = creditLimit > 0 AND balance > creditLimit`.

**D10 — Contrato de respuesta.** Importes como strings de 2 decimales. Se corrige `IAccountReceivableMovement` en shared-types (montos `string`, sin `receiptId`, que la entidad no tiene) y se agregan tipos de respuesta del resumen, del ledger y de la lista global. El frontend consume esos tipos.

**D11 — Frontend.** `features/receivables/` con el patrón existente (`api`, `hooks/keys`, `hooks/use-*-query`, `components`, `utils`). Pantalla `/receivables` (tabla + filtros + badges MOROSO/AL_DÍA + tramos) reemplaza el placeholder; la cuenta corriente del cliente es una pestaña de `CustomerDetailPage`, sin ruta nueva (el wireframe permite ambas y evita duplicar pantallas). La descarga del PDF reutiliza la mecánica de blob + `<a download>`. "Registrar Cobro" se muestra deshabilitado con leyenda hasta el cambio 2. Importes con `formatCurrency` de `features/products/utils/products.math.ts`.

## Risks / Trade-offs

- [Backfill sobre datos reales de staging/producción] → La migración es idempotente, solo inserta, y un agente no la corre fuera de local; se ejecuta con aprobación humana. Verificar con consulta de conteo: cuentas sin FACTURA = 0.
- [Saldo corrido con ventana sobre todo el historial del cliente] → Aceptable para el volumen de una distribuidora; índice existente `(account_receivable_id, created_at)` cubre el join. Si un cliente supera decenas de miles de movimientos, materializar el saldo.
- [Cuentas creadas por ventas antes de que exista CAE] La deuda se crea al confirmar la venta, antes del CAE (comportamiento actual). El ledger refleja esa deuda desde la venta; no se cambia acá.
- [NC posterior a cobros parciales falla por `SALE_RETURN_RECEIVABLE_INCONSISTENCY`] Se hará visible con el cambio 2; se mantiene decidido, no se resuelve en este cambio.
- [Docs desalineados] `docs/domain_model.md` usa `balanceAfter` / `referenceId`; el código usa `previousBalance` / `subsequentBalance` / `fiscalDocumentId` / `saleReturnId`. Se toma el código como fuente y se actualiza el doc al cerrar el cambio.

## Migration Plan

1. Merge del código con la migración `1700000000029`.
2. Correr `pnpm db:migrate` en local (un agente no la corre en staging/producción). Humano la aplica en staging con backup previo.
3. Verificar: `SELECT count(*) FROM account_receivables ar WHERE NOT EXISTS (SELECT 1 FROM account_receivable_movements m WHERE m.account_receivable_id = ar.id AND m.movement_type = 'FACTURA')` devuelve 0.
4. Rollback: `pnpm db:revert` solo antes de que existan movimientos posteriores; el código previo ignora los `FACTURA` extra, así que revertir solo el código también es seguro.

## Open Questions

- MOROSO = deuda más antigua > 30 días (tomado del wireframe 26: "rojo para saldos con antigüedad > 30 días"). ¿El cliente quiere otro umbral o que sea configurable? Se implementa como constante hasta que lo pida.
- `creditLimit = 0` como "sin límite": ¿es correcto para el cliente, o 0 significa "sin crédito"? Se asume "sin límite configurado".

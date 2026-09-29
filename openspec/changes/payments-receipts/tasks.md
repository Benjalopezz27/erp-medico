# Tasks

## 1. Shared types

- [x] 1.1 Alinear `IPayment`, `IPaymentAllocation`, `IReceipt` en `packages/shared-types/src/models/receivables.model.ts` (montos `string`, `allocationType`, `paymentId` en movimiento) y agregar tipos de request (unión `DIRECTED | GLOBAL_AGE`), respuesta de recibo y códigos de error de cobro. Verificar con `pnpm build` en `packages/shared-types` y typecheck de backend y frontend sin errores.

## 2. Migración y entidades

- [x] 2.1 Escribir migración `1700000000030` en `apps/backend/src/database/migrations/`: tablas `payments`, `payment_allocations` (CHECK monto > 0, UNIQUE por cobro y cuenta), `receipts`, `receipt_counters` sembrada en 0 y columna nullable `payment_id` en `account_receivable_movements`; `down` documentado. Verificar con spec de migración (patrón `database/migration-sales.spec.ts`): `up` crea todo, correr dos veces no falla y `down` lo elimina.
- [x] 2.2 Crear entidades `Payment`, `PaymentAllocation`, `Receipt` en `modules/payments/entities/` y agregar `paymentId` a `AccountReceivableMovement`. Verificar con `pnpm db:migrate` y `pnpm db:revert` solo en la base local sin errores; no ejecutar contra staging/producción.

## 3. Aplicación de pagos en el ledger

- [x] 3.1 Tests que fallan primero en `receivables.service.spec.ts` para `applyPayment`: pago parcial (PARCIAL, previous/subsequent correctos), cancelación total (CANCELADO), monto mayor al saldo (409), factura de otro cliente (400), factura duplicada (400), sin transacción activa (error). Verificar que fallan antes del cambio.
- [x] 3.2 Implementar `ReceivablesService.applyPayment` con lock `pessimistic_write` ordenado por id y movimientos `PAGO` con `userId` y `paymentId`. Verificar que pasa `receivables.service.spec.ts`.
- [x] 3.3 Agregar la cascada por antigüedad (orden `created_at`, `id`, corte al agotar) y el rechazo si el monto excede el saldo total. Verificar con spec: facturas $150/$200/$100 y cobro $250 dejan CANCELADO, PARCIAL con "100.00" y sin cambio; cobro $500 sobre deuda $450 da 409.

## 4. Cobro y recibo

- [x] 4.1 Tests que fallan primero para `ReceiptNumberService`: números `0001-00000001`, `0001-00000002` consecutivos y rollback de la transacción que devuelve el número. Implementar con `receipt_counters` y `FOR UPDATE`. Verificar que los tests pasan.
- [x] 4.2 Implementar `PaymentsService.register` (valida cliente, crea `Payment`, `applyPayment`, `Receipt`, todo en una transacción) y DTOs validados con Swagger; importar `ReceivablesModule` y las entidades en `PaymentsModule`. Verificar con spec de servicio: cobro exitoso crea pago, aplicaciones, movimientos y recibo; error en una aplicación no deja nada; medio `CHEQUE` da 400; montos con más de 2 decimales dan 400.
- [x] 4.3 Agregar `POST /payments` y `GET /receipts/:id` con `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMINISTRADOR, VENDEDOR)`, 404 para cliente o recibo inexistente y conservar `GET /payments/status`. Verificar con e2e: 401 sin token, 201 como VENDEDOR, 404, 409 por exceso y `status` sigue respondiendo.

## 5. PDF

- [x] 5.1 Función pura del total en letras (`Son pesos: ... con 00/100`) y `ReceiptPdfService` con `pdf-lib` (A4, cliente, comprobantes aplicados, medio, total, firma). Verificar con spec: `1250.50` da "mil doscientos cincuenta con 50/100", el resultado empieza con `%PDF` y un recibo con muchas facturas genera el documento.
- [x] 5.2 Agregar `GET /receipts/:id/pdf` con `Content-Type: application/pdf` y `Content-Disposition` con el número. Verificar con e2e: 200 y bytes `%PDF`, 404 y 401.

## 6. Frontend

- [x] 6.1 Crear `features/payments/` (api, keys, mutación de cobro, query de recibo, utilidades de cascada) con handlers MSW. Verificar con specs de API, hooks y de la utilidad de cascada (mismo resultado que el caso 3.3).
- [x] 6.2 Construir `/payments/new` (wireframe 27: cliente, modo antigüedad/manual, inputs por factura, medio efectivo/transferencia, total aplicado = cobrado) y registrar la ruta. Verificar con spec de página: llenado por antigüedad, botón deshabilitado con diferencia, envío y navegación al recibo.
- [x] 6.3 Construir `/receipts/:id` (wireframe 28) con Imprimir y Exportar PDF, y habilitar "Registrar Cobro" en la pestaña Cuenta Corriente con `customerId` preseleccionado. Verificar con `CustomerDetailPage.spec.tsx` actualizado, spec de la vista y que `router.spec.ts` sigue pasando.

## 7. Cierre

- [ ] 7.1 Escribir e2e `payments-receipts.e2e-spec.ts`: 3 ventas a crédito, cobro dirigido parcial, cobro por antigüedad, recibo y PDF, invariante saldo del cliente = suma con signo de movimientos y cobros concurrentes sobre una factura (uno gana, uno 409). Verificar con `pnpm --filter backend test:e2e`.
- [ ] 7.2 Actualizar `docs/domain_model.md` (Payment, PaymentAllocation, Receipt, contador) y correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores.
- [ ] 7.3 Smoke manual con `ArcaMockService`: crear 3 ventas a crédito, registrar cobro dirigido y por antigüedad desde la UI, ver saldo y ledger, abrir el recibo y descargar el PDF. Sin datos fiscales reales.

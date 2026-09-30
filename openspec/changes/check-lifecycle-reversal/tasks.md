# Tasks

## 1. Shared types

- [x] 1.1 En `packages/shared-types` agregar `PaymentStatus`, códigos `CHECK_*`, realinear `ICheck` (montos `string`, `drawerName`, `dueDate`, `paymentId`, `endorsedToSupplierId`), agregar `check?` a `IRegisterPaymentRequest`, `paymentStatus` y `check` a `IReceiptDetail`, y tipos de listado/detalle/impacto de cheque. Verificar con `pnpm build` de shared-types y typecheck de backend y frontend sin errores.

## 2. Migración y entidades

- [ ] 2.1 Escribir spec de migración que falla primero (patrón `migration-payments-receipts.spec.ts`), luego migración `1700000000031` (`checks` con constraints e índices, `payments.status` con CHECK y default, `down` documentado). Verificar: `up` crea todo, dos corridas no fallan y `down` lo elimina.
- [ ] 2.2 Crear entidad `Check`, agregar `status` a `Payment` y registrar `Check` en `PaymentsModule` y `ChecksModule`. Verificar con `pnpm db:migrate` y `pnpm db:revert` solo en base local.

## 3. Cobro con cheque (US-31)

- [ ] 3.1 Tests que fallan primero en `payments.service.spec.ts`: CHEQUE crea `Check` RECIBIDO con monto del total, falta `check` da 400, `check` con EFECTIVO da 400, duplicado da 409 sin efectos, error en aplicación no deja cheque. Verificar que fallan antes del cambio.
- [ ] 3.2 Extender `RegisterPaymentDto` (`check` validado, Swagger) y `PaymentsService.register`; mapear el error de unicidad a `CHECK_DUPLICATE`. Verificar que pasan los specs del 3.1 y los existentes.

## 4. Transiciones (US-31)

- [ ] 4.1 Tests que fallan primero en `checks.service.spec.ts`: tres transiciones válidas, cada transición inválida da 409, endoso a proveedor inexistente da 404, dos transiciones concurrentes (una gana, otra 409), auditoría registrada. Verificar que fallan antes.
- [ ] 4.2 Implementar `ChecksService` (método `transition` con lock, máquina de estados, auditoría), DTOs, y `ChecksController` con `PATCH to-cartera|deposit|endorse` (`JwtAuthGuard`, `RolesGuard`, `@Roles(ADMINISTRADOR)`), conservando `GET /checks/status`. Verificar que pasa el spec del 4.1.
- [ ] 4.3 Implementar `GET /checks` (filtros, paginación, `dueSoonCount`) y `GET /checks/:id` (con cliente y cobro). Verificar con spec: filtro por estado, cheque que vence en 3 días cuenta en `dueSoonCount`, VENDEDOR recibe 403.

## 5. Reversión por rechazo (US-32)

- [ ] 5.1 Tests que fallan primero en `receivables.service.spec.ts` para `reversePayment`: factura cancelada vuelve a PENDIENTE, factura con pago previo vuelve a PARCIAL, una fila `REVERSION_CHEQUE` por aplicación con previous/subsequent correctos, exceso sobre `originalAmount` da error de inconsistencia, sin transacción activa da error. Verificar que fallan antes.
- [ ] 5.2 Implementar `ReceivablesService.reversePayment` (locks ordenados por id, función pura de cálculo compartida con el impacto previsto). Verificar que pasa el spec del 5.1.
- [ ] 5.3 Tests que fallan primero y luego implementación de `ChecksService.reject` + `PATCH /checks/:id/reject` (cheque, cobro REVERTIDO, reversión y auditoría en una transacción; estados RECIBIDO/ENDOSADO/RECHAZADO dan 409; falla a mitad no deja nada). Agregar `rejectionImpact` a `GET /checks/:id`. Verificar con spec de servicio y de controller.

## 6. Recibo

- [ ] 6.1 Mostrar cheque (banco y número) y marca REVERTIDO en `ReceiptsService` (detalle) y `ReceiptPdfService`. Verificar con specs: recibo con cheque incluye "Cheque (Banco …, N° …)", revertido incluye `paymentStatus = REVERTIDO` y el PDF sigue empezando con `%PDF`.

## 7. Frontend

- [ ] 7.1 Crear `features/checks/` (api, keys, hooks de listado/detalle/transiciones/rechazo, utilidades de estado y acciones permitidas) con handlers MSW. Verificar con specs de API, hooks y de la utilidad de acciones por estado.
- [ ] 7.2 Extender `PaymentFormPage`: opción "Cheque" con banco, número, librador, vencimiento y emisión opcional; validación con zod; envío con `check`. Verificar con `PaymentFormPage.spec.tsx`: campos aparecen solo con Cheque, botón deshabilitado con datos faltantes, envío correcto.
- [ ] 7.3 Construir `/treasury/checks` (wireframe 29: tabla, filtros estado y vencimiento, banner y badge de 7 días, acciones según estado, modal de rechazo con impacto), registrar ruta, permiso solo ADMINISTRADOR y enlace de navegación. Mostrar cheque y marca REVERTIDO en `ReceiptPage`. Verificar con specs de página, del modal y `router.spec.ts`.

## 8. Cierre

- [ ] 8.1 Escribir e2e `checks-lifecycle.e2e-spec.ts`: cobro con cheque que cancela 2 facturas, 5 transiciones válidas, transiciones inválidas, rechazo desde EN_CARTERA y desde DEPOSITADO, invariante de saldo del cliente y de cada cuenta, doble rechazo concurrente (uno gana, otro 409) y rollback ante falla inyectada. Verificar con `pnpm --filter backend test:e2e`.
- [ ] 8.2 Actualizar `docs/domain_model.md` (`Check` real, `Payment.status`, enum `REVERSION_CHEQUE`) y `docs/DEBT.md` (rechazo de ENDOSADO pendiente). Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores.
- [ ] 8.3 Smoke manual con claude-in-chrome y `ArcaMockService`: dos ventas a crédito, cobro con cheque que las cancela, ver recibo, pasar el cheque por cartera y depósito, rechazar un segundo cheque y verificar facturas PENDIENTE y ledger con `REVERSION_CHEQUE`. Sin datos fiscales reales.

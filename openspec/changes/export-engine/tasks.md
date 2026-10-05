# Tasks

## 1. Tipos y registro

- [x] 1.1 Crear `report.types.ts` (`ReportColumn`, `ReportRow`, `ReportDefinition`, token `REPORT_DEFINITIONS`) en `modules/reports/`. Verificar con typecheck del backend sin errores.

## 2. ExportService

- [x] 2.1 Test que falla primero `export.service.spec.ts` para `toExcel`: encabezado + filas en orden, sin filas, montos numéricos con 2 decimales. Verificar que falla antes del cambio.
- [x] 2.2 Implementar `toExcel` con `exceljs`. Verificar que pasa el spec.
- [x] 2.3 Test que falla primero para `toPdf`: devuelve PDF válido (`%PDF`), paginación con >60 filas, texto no WinAnsi no lanza error. Implementar `toPdf` con `pdf-lib`. Verificar que pasa.

## 3. Endpoint genérico

- [x] 3.1 Tests que fallan primero `reports.controller.spec.ts`: 404 tipo inexistente, 400 formato inválido, headers de Excel/PDF, `json` por defecto, guards ADMINISTRADOR. Implementar `GET /reports/:type` reemplazando el stub `status`. Verificar que pasan.
- [x] 3.2 Registrar `ExportService` y el multi-provider en `ReportsModule` y verificar el arranque con `pnpm --filter backend build`.

## 4. Frontend

- [x] 4.1 Crear `features/reports/api/download-report.ts` (blob + nombre desde `Content-Disposition`) con test. Verificar con `pnpm --filter frontend test`.

## 5. Cierre

- [x] 5.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build`. Verificar todo en verde.

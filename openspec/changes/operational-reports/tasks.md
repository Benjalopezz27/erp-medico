# Tasks

## 1. Base de reportes

- [x] 1.1 Tests que fallan primero y helper `WhereBuilder` (fechas válidas, rango argentino, enums) y `createSqlReport` (totales con decimales exactos). Verificar que pasan.

## 2. Reportes backend

- [x] 2.1 US-37 `sales` y US-43 `collections`, con tests de armado de consulta.
- [x] 2.2 US-39 `stock-valuation`, US-40 `stock-movements` y US-38 `profitability`.
- [x] 2.3 US-41 `purchases`, US-44 `checks-portfolio`, US-45 `supplier-invoices` y US-42 `receivables-aging`.
- [x] 2.4 Registrar las nueve en `ReportsModule` y ejecutar cada una contra la base local para validar el SQL.

## 3. Frontend

- [ ] 3.1 `features/reports/`: configuración de reportes, hook de consulta y componentes de filtros y tabla. Tests con vitest.
- [ ] 3.2 Páginas `/reports` (índice) y `/reports/$type`, rutas, título de la barra y botones Excel/PDF. Tests.

## 4. Cierre

- [ ] 4.1 `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` en verde.

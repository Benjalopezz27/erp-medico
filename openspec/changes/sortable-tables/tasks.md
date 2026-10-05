# Tasks

## 1. Base compartida

- [x] 1.1 Agregar `SortOrder` y helper de lista blanca a `packages/shared-types`; verificar con build del paquete
- [x] 1.2 Backend: helper `resolveSort` con lista blanca y desempate por id; verificar con test unitario (columna válida, inválida, dirección en minúsculas, default)
- [x] 1.3 Frontend: `SortableTh`, `nextSort` y `useClientSort`; verificar con specs del ciclo asc → desc → default, `aria-sort`, teclado, y orden numérico y de fila `TOTAL`

## 2. Backend: orden en listados paginados

- [x] 2.1 Productos, ventas, órdenes de compra y facturas de proveedor: `sortBy`/`sortOrder` en DTO y servicio; verificar con tests de orden, default sin parámetros y 400 por columna inválida
- [x] 2.2 Stock (incluye columnas derivadas stock actual y estado), movimientos de stock y cuarentena; verificar con tests de orden y comparación con el estado calculado
- [x] 2.3 Deudores (SQL crudo con lista blanca de alias), alertas fiscales, revisión de precios, movimientos de tesorería y cheques; verificar con tests de orden y default
- [x] 2.4 Confirmar que clientes, proveedores, catálogo de proveedor y usuarios mantienen su orden y su validación; verificar con sus tests existentes

## 3. Frontend: tablas servidor

- [x] 3.1 Ampliar validadores de search params y capa API con `sortBy`/`sortOrder` (incluye usuarios) y reset a página 1 al ordenar; verificar con specs de los validadores
- [x] 3.2 Aplicar `SortableTh` en productos, clientes, proveedores, catálogo de proveedor y usuarios; verificar con spec de cada tabla (click, URL, indicador)
- [x] 3.3 Aplicar en ventas, stock, movimientos de stock, cuarentena, órdenes de compra y facturas de proveedor; verificar con specs
- [x] 3.4 Aplicar en deudores, alertas fiscales, revisión de precios, tesorería y cheques (estado local); verificar con specs

## 4. Frontend: tablas cliente

- [x] 4.1 Aplicar orden cliente en categorías, unidades y reportes con `TOTAL` fijo al final; verificar con specs

## 5. Verificación final

- [x] 5.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build` sin errores
- [ ] 5.2 Prueba manual: ordenar ventas, productos, stock y cuentas corrientes en ambos sentidos, recargar, navegar al detalle y volver

# Plan de Sprints Detallado — ERP Distribuidora Médica

**Versión:** 1.0  
**Total de Sprints:** 11 (Sprint 0 + Sprints 1–10)  
**Esfuerzo Total Estimado:** ~57.5 Días / Hombre  
**Duración aproximada:** 12–13 semanas (~3 meses)  
**Modelo:** Single Developer · Sprints de 1 semana (5 días hábiles)  
**Stack:** NestJS · TypeORM · PostgreSQL · Vite + React 19 · BullMQ · pnpm Workspaces  

---

## Definición de Done (DoD) — Global

Toda historia de usuario se considera **Done** cuando:

- [ ] Migración de base de datos aplicada y reversible (`typeorm migration:revert`)
- [ ] Entidad TypeORM, Service y Controller implementados
- [ ] Validación de DTOs con `class-validator`
- [ ] Endpoint documentado en Swagger (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- [ ] Tests unitarios del Service escritos y pasando (cobertura ≥ 80% en la lógica de negocio)
- [ ] Al menos 1 test de integración por endpoint crítico
- [ ] UI del frontend funcional (no necesariamente pulida estéticamente)
- [ ] CI verde en rama `dev`
- [ ] Código revisado por el propio desarrollador (self-review)
- [ ] `CHANGELOG.md` o commit message descriptivo

---

## 🗓️ Sprint 0 — Infraestructura & Scaffolding

**Duración:** ~3 días  
**Objetivo:** El repositorio está creado, el monorepo corre localmente con Docker, el CI pasa, y hay un app skeleton de NestJS + Vite funcional con una ruta de health-check. El equipo puede empezar a escribir código de dominio desde el día 1 del Sprint 1.

> **No hay User Stories en este sprint — solo tareas de infraestructura.**

### Tareas

| ID | GitHub Issue | Descripción | Tipo | Estado |
|----|--------------|-------------|------|--------|
| S0-T01 | #12 | Crear repositorio y configurar branch strategy (`main`, `dev`, branch protection) | Infra | ✅ Cerrada |
| S0-T02 | #13 | Inicializar monorepo `pnpm workspaces` con `apps/backend`, `apps/frontend`, `packages/shared-types` | Infra | ✅ Cerrada |
| S0-T03 | #14 | Configurar Docker Compose (`postgres:16-alpine`, `redis:7-alpine`, `mailhog`) | Infra | ✅ Cerrada |
| S0-T04 | #15 | Scaffold NestJS backend con 18 módulos bounded-context del dominio | Backend | ✅ Cerrada |
| S0-T05 | #16 | Configurar TypeORM y sistema de migraciones con PostgreSQL 16 | Backend | ✅ Cerrada |
| S0-T06 | #17 | Crear `HealthCheckController` y diagnóstico de base de datos (`GET /api/v1/health`) | Backend | ✅ Cerrada |
| S0-T07 | #18 | Scaffold Vite + React 19 frontend con dependencias base (TanStack, Tailwind, Lucide, Zod) | Frontend | ⏳ En progreso |
| S0-T08 | #19 | Crear layout base del frontend (`RootLayout` sidebar + topbar, `AuthLayout`, login/404 stubs) | Frontend | ⏳ Pendiente |
| S0-T09 | #20 | Crear package `shared-types` con enums y tipos base del dominio | Shared | ⏳ Pendiente |
| S0-T10 | #21 | Configurar ESLint + Prettier en monorepo | Infra | ⏳ Pendiente |
| S0-T11 | #22 | Configurar GitHub Actions CI (`.github/workflows/ci.yml`) | Infra | ⏳ Pendiente |
| S0-T12 | #23 | Crear `.env.example` documentado | Infra | ✅ Completado |
| S0-T13 | #24 | Crear script de seed inicial de usuarios (`ADMINISTRADOR`, `VENDEDOR`) hasheados | Backend | ⏳ Pendiente |
| S0-T14 | #25 | Crear `ArcaMockService` para ambiente de desarrollo | Backend | ⏳ Pendiente |
| S0-T15 | #26 | Crear README del proyecto con badges e instrucciones | Docs | ⏳ Pendiente |

### ✅ Definition of Done — Sprint 0
- [ ] `docker compose up -d` levanta sin errores
- [ ] `pnpm --filter backend run start:dev` arranca NestJS en `:3000`
- [ ] `GET http://localhost:3000/health` responde `200 OK`
- [ ] `pnpm --filter frontend run dev` arranca Vite en `:5173` y muestra el layout base
- [ ] `pnpm -r run lint` pasa sin errores
- [ ] CI pipeline pasa en GitHub Actions

### 🎬 Demo al Final del Sprint 0
Mostrar el monorepo corriendo localmente: health endpoint en Postman, layout skeleton del frontend en el browser, CI verde en GitHub.

---

## 🗓️ Sprint 1 — Auth & Catálogo Base

**Duración:** 5 días  
**Historias:** US-01, US-02, US-03, US-04, US-05  
**Estimación Total:** ~6.5 días (ajustado a 5 por paralelismo backend/frontend en tareas simples)

### 🎯 Sprint Goal
Un usuario puede iniciar sesión con su rol, y el Administrador puede gestionar el catálogo completo de productos con categorías, unidades y conversiones.

---

### US-01 — Autenticación y Gestión de Sesión *(1 día)*

**Tareas:**
1. **[Backend]** Migración + entidad `User` (id, name, email, passwordHash, role, isActive, timestamps)
2. **[Backend]** `AuthModule`: `AuthService.login()` con bcrypt compare, `JwtStrategy` (Passport), `JwtAuthGuard`, `RolesGuard`, decorador `@Roles()`
3. **[Backend]** `POST /auth/login` → devuelve `{ accessToken, user: { id, name, role } }`
4. **[Backend]** Seed de usuarios funcional y verificable con `POST /auth/login`
5. **[Frontend]** Página de Login: formulario con React Hook Form + Zod (`email`, `password`), llamada a API, almacenamiento del token en memoria (Zustand store `useAuthStore`), redirección según rol
6. **[QA]** Test unitario `AuthService.login()` (credenciales válidas / inválidas / usuario inactivo), test E2E del endpoint

---

### US-02 — Administración de Usuarios y Auditoría Inmutable *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `AuditLog` (id, action, entityName, entityId, previousValueJSON, newValueJSON, userId, createdAt — inmutable, sin UPDATE ni DELETE)
2. **[Backend]** `UsersModule`: CRUD completo. `DELETE` → soft delete (`isActive = false`). Prohibir desactivar usuarios con transacciones referenciadas
3. **[Backend]** `AuditLogInterceptor`: interceptor NestJS que registra automáticamente en `AuditLog` para mutaciones en `users` y futuras entidades sensibles
4. **[Frontend]** Página `/admin/users`: tabla con TanStack Table (nombre, email, rol, estado), modal de creación/edición con React Hook Form, botón de desactivar con confirmación
5. **[QA]** Tests unitarios `UsersService`, test de que el soft-delete no elimina el registro

---

### US-03 — CRUD de Categorías y Unidades de Medida *(1 día)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `Category` (id, name, description) y `Unit` (id, name, symbol)
2. **[Backend]** `CategoriesModule` y `UnitsModule` con CRUD básico (GET list, GET one, POST, PATCH, DELETE con validación de uso)
3. **[Frontend]** Página `/admin/settings` con tabs: "Categorías" y "Unidades". Tablas simples con botón de agregar/editar (inline o modal pequeño)
4. **[QA]** Test: no se puede eliminar una categoría con productos asociados

---

### US-04 — Catálogo de Productos y Factores de Conversión *(2 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `Product` y `ProductUnitConversion`
2. **[Backend]** `ProductsModule`: CRUD, validación de `internalCode` único, cálculo de `suggestedPriceNet = costNet × (1 + markupPercentage / 100)` en creación/actualización
3. **[Backend]** Endpoint `GET /products/:id/conversions` + `POST /products/:id/conversions` para gestionar las equivalencias de unidades
4. **[Frontend]** Página `/products/new` y `/products/:id/edit`: formulario completo con sección de conversiones (tabla dinámica: agregar/quitar filas de `Unidad Presentación → Factor`)
5. **[Frontend]** Página `/products` (lista): TanStack Table con columnas Código, Nombre, Categoría, Stock, Precio, Estado. Filtros por categoría y estado
6. **[QA]** Tests unitarios: cálculo de precio sugerido, validación de internalCode único, conversión a unidades base

---

### US-05 — Consulta y Búsqueda de Productos *(1 día)*

**Tareas:**
1. **[Backend]** `GET /products?search=&category=&status=` con filtros combinados + paginación (offset/limit)
2. **[Backend]** `GET /products/search?q=` endpoint optimizado para typeahead (devuelve id, internalCode, name, stock, activePriceNet)
3. **[Frontend]** Componente `ProductSearchInput`: input con debounce de 300ms, dropdown de resultados, selección emite el producto completo. Reutilizable en ventas, compras, etc.
4. **[QA]** Test de endpoint de búsqueda con casos: búsqueda por código exacto, búsqueda parcial por nombre, sin resultados

---

### ✅ Definition of Done — Sprint 1
- [ ] Login funcional con ambos roles (redirige a dashboard diferente según rol)
- [ ] CRUD de usuarios con audit log visible en DB
- [ ] Categorías, unidades, productos y conversiones guardándose correctamente
- [ ] Buscador de productos funcional con debounce
- [ ] Swagger actualizado con todos los endpoints del sprint
- [ ] CI verde

### 🎬 Demo al Final del Sprint 1
Login como VENDEDOR y ADMINISTRADOR, navegación al catálogo, crear un producto con 2 conversiones (ej. Caja=10 unidades, Caja Master=100 unidades), buscarlo por nombre.

---

## 🗓️ Sprint 2 — Motor de Stock e Inventario Ledger

**Duración:** 5 días  
**Historias:** US-06, US-07, US-08, US-09, US-10  
**Estimación Total:** ~7.5 días (las historias de alta complejidad se solapan en algunos flujos)

### 🎯 Sprint Goal
El sistema tiene un ledger de stock inmutable, el backend rechaza cualquier operación que genere stock negativo con un lock a nivel DB, y el Administrador puede gestionar ajustes manuales y la cuarentena.

---

### US-06 — Ledger Transaccional Inmutable de Stock *(2 días)*

**Tareas:**
1. **[Backend]** Migraciones: tabla `stock` (productId unique, currentBaseStock int ≥ 0) + tabla `stock_movements` (inmutable: sin UPDATE ni DELETE, solo INSERT)
2. **[Backend]** `StockService.recordMovement(params)`: método central que crea el `StockMovement` y actualiza `Stock.currentBaseStock` dentro de una transacción TypeORM. Guarda `previousStock` y `newStock`
3. **[Backend]** `GET /stock` (lista todos los productos con stock actual) y `GET /stock/:productId/movements` (ledger filtrable por fecha y tipo)
4. **[Frontend]** Página `/stock`: tabla con Código, Producto, Stock Actual, Unidad Base, Stock Mínimo, Estado (normal/bajo/crítico). Color-coded según nivel
5. **[Frontend]** Página `/stock/:productId`: detalle con gráfico de evolución (Recharts) + tabla de movimientos del ledger
6. **[QA]** Test: verificar que `currentBaseStock = suma de todos los movimientos` en la DB tras N operaciones

---

### US-07 — Backend-Enforcement de Stock No Negativo *(1.5 días)*

**Tareas:**
1. **[Backend]** En `StockService.recordMovement()`: si `movementType = SALIDA` y `newStock < 0` → lanzar `InsufficientStockException` (HTTP 422) con mensaje descriptivo
2. **[Backend]** Implementar `SELECT stock FOR UPDATE` dentro de la transacción TypeORM usando `QueryRunner` + `setLock('pessimistic_write')` antes de calcular el nuevo stock
3. **[Backend]** Constraint a nivel DB: `CHECK (current_base_stock >= 0)` en la migración de `stock`
4. **[QA]** Tests de concurrencia simulada: dos salidas simultáneas del mismo producto donde solo una debería pasar. Test de lanzamiento de `InsufficientStockException`

---

### US-08 — Movimientos Manuales y Alertas de Stock Bajo *(1 día)*

**Tareas:**
1. **[Backend]** `POST /stock/adjustments`: endpoint para ajustes manuales. Body: `{ productId, type: ENTRADA|SALIDA|MERMA|AJUSTE, quantityBaseUnits, reason }`. Reason es obligatorio
2. **[Backend]** `GET /stock/alerts`: devuelve productos donde `currentBaseStock <= minStock`
3. **[Frontend]** Modal de "Ajuste Manual" accesible desde la lista de stock (solo ADMINISTRADOR). Formulario: tipo de movimiento, cantidad, motivo
4. **[Frontend]** Badge/indicator en el sidebar que muestra la cantidad de productos bajo mínimo. Clickeable navega a `/stock?filter=alerts`
5. **[QA]** Test: ajuste manual con motivo vacío debe ser rechazado

---

### US-09 — Carga Inicial Masiva de Inventario *(1.5 días)*

**Tareas:**
1. **[Backend]** `POST /stock/bulk-load`: acepta archivo Excel/CSV con columnas `internalCode | quantityBase`. Parsea con SheetJS, valida códigos contra catálogo, registra un `StockMovement` de tipo `AJUSTE` con reason = "Carga Inicial" para cada fila
2. **[Backend]** Validación previa: devuelve preview con errores (códigos no encontrados, cantidades inválidas) antes de confirmar la importación
3. **[Frontend]** Página `/stock/bulk-load`: uploader de archivo, tabla de preview con filas válidas (verde) e inválidas (rojo), botón "Confirmar Carga" deshabilitado si hay errores
4. **[QA]** Test: importación con 3 productos válidos y 1 código inválido → debe rechazar completo o aplicar solo válidos según configuración

---

### US-10 — Gestión de Stock Retenido / Cuarentena *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `QuarantineStock` (id, productId, quantityBaseUnits, reason, status: EN_CUARENTENA | MERMA_CONFIRMADA | DEVOLUCION_PROVEEDOR | REINGRESADO_STOCK, userId, timestamps)
2. **[Backend]** `POST /quarantine`: registra ingreso a cuarentena (viene desde flujo de devoluciones — stub por ahora)
3. **[Backend]** `PATCH /quarantine/:id/resolve`: con `{ resolution: MERMA | DEVOLUCION_PROVEEDOR | REINGRESO }`. Si REINGRESO → llama a `StockService.recordMovement(ENTRADA)` con autorización
4. **[Frontend]** Página `/stock/quarantine`: tabla de ítems en cuarentena con botón de resolución por fila (dropdown: Confirmar Merma / Devolver Proveedor / Reingresar)
5. **[QA]** Test: reingreso a stock desde cuarentena actualiza correctamente el ledger

---

### ✅ Definition of Done — Sprint 2
- [ ] `POST /sales` (aún no existe, pero `StockService.recordMovement()` rechaza salidas con stock insuficiente)
- [ ] Ledger de stock visible y correcto para al menos 5 movimientos de prueba
- [ ] Ajuste manual funcional con audit log
- [ ] Bulk load funcional con validación previa
- [ ] Cuarentena con los 3 flujos de resolución operativos
- [ ] CI verde

### 🎬 Demo al Final del Sprint 2
Crear movimientos manuales de ENTRADA y SALIDA en un producto, intentar hacer una SALIDA que supere el stock (debe ser rechazada con error), hacer una carga masiva desde Excel, ver el ledger completo.

---

## 🗓️ Sprint 3 — Proveedores & Importador Configurable

**Duración:** 5 días  
**Historias:** US-11, US-12, US-13, US-14  
**Estimación Total:** ~8 días (los más complejos del sprint inicial)

### 🎯 Sprint Goal
El Administrador puede gestionar proveedores, asociar sus SKUs externos a productos internos, subir un archivo Excel, configurar su mapeo de columnas y guardarlo como plantilla reutilizable.

---

### US-11 — CRUD de Proveedores *(1 día)*

**Tareas:**
1. **[Backend]** Migración + entidad `Supplier` (businessName, cuit unique, address, phone, email, whatsApp, taxCondition, status: ACTIVO|INACTIVO)
2. **[Backend]** `SuppliersModule`: CRUD con soft-delete, validación de CUIT único
3. **[Frontend]** Página `/suppliers`: tabla con búsqueda + botón "Nuevo Proveedor". Modal o página de formulario completo. Links directos a `wa.me/{whatsApp}` y `mailto:{email}`
4. **[QA]** Test: CUIT duplicado debe ser rechazado

---

### US-12 — Diccionario de Códigos Producto ↔ Proveedor *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `SupplierProduct` (supplierId, productId, supplierSku, supplierDescription, purchaseUnitId, conversionFactor, habitualCost, isHabitualSupplier)
2. **[Backend]** `GET /suppliers/:id/products` y `POST/PATCH/DELETE /suppliers/:id/products/:productId`
3. **[Frontend]** Sub-página `/suppliers/:id/catalog`: tabla de SKUs del proveedor con búsqueda de producto interno mediante `ProductSearchInput`. Edición inline de factor de conversión y costo habitual
4. **[QA]** Test: no se puede asociar el mismo producto dos veces al mismo proveedor

---

### US-13 — Subida, Mapeo Dinámico y Plantillas por Proveedor *(3 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `SupplierImportTemplate` (supplierId, name, mappingJSON: `{ skuColumn, descColumn, qtyColumn, priceColumn, unitColumn }`)
2. **[Backend]** `POST /importador/upload`: acepta multipart con `supplierId` y archivo. Parsea con SheetJS. Devuelve `{ headers: string[], preview: row[][], detectedMapping?: {...} }`
3. **[Backend]** `POST /importador/templates`: guarda una plantilla. `GET /importador/templates?supplierId=`: lista plantillas del proveedor
4. **[Frontend]** Wizard de importación paso a paso:
   - **Paso 1:** Select proveedor + uploader de archivo
   - **Paso 2:** Mapeo de columnas: tabla con headers del archivo, dropdowns para asignar cada header a un campo semántico (SKU, Descripción, Cantidad, Precio, Unidad). Botón "Guardar como plantilla"
5. **[Frontend]** Al seleccionar un proveedor con plantilla guardada: auto-aplicar el mapeo y mostrar badge "Plantilla aplicada: [nombre]"
6. **[QA]** Test: subir un Excel de 5 columnas, mapear, guardar plantilla, subir otro Excel del mismo proveedor y verificar que la plantilla se auto-aplica

---

### US-14 — Previsualización, Validaciones y Resolución de Desconocidos *(2.5 días)*

**Tareas:**
1. **[Backend]** `POST /importador/preview`: recibe el mapping configurado + el archivo. Aplica el mapping, busca cada SKU en `SupplierProduct`, devuelve: `{ valid: [], unknown: [], errors: [] }` donde `unknown` son SKUs que no están en el diccionario
2. **[Backend]** `POST /importador/resolve-unknown`: recibe `{ supplierSku, productId, conversionFactor }`, crea el `SupplierProduct`, devuelve el ítem resuelto
3. **[Backend]** `POST /importador/confirm`: aplica la importación confirmada. Según el tipo (precio o stock), actualiza los registros correspondientes dentro de una transacción
4. **[Frontend]** Paso 3 del Wizard — Preview: tabla con 3 secciones colapsables: "Listos para importar" (verde), "SKUs desconocidos" (naranja), "Errores" (rojo)
5. **[Frontend]** Para cada SKU desconocido: dropdown `ProductSearchInput` para asociarlo al producto interno + input de factor de conversión → botón "Resolver". Al resolver, el ítem pasa a la sección verde
6. **[Frontend]** Botón "Confirmar Importación" habilitado solo cuando no hay errores pendientes
7. **[QA]** Test: importación con 2 SKUs válidos + 1 desconocido → resolver el desconocido → confirmar → verificar que los 3 se procesaron

---

### ✅ Definition of Done — Sprint 3
- [ ] CRUD de proveedores completo con diccionario de SKUs
- [ ] Wizard de importación completo (4 pasos: upload → mapeo → preview/resolución → confirmación)
- [ ] Plantillas guardadas y auto-aplicadas
- [ ] CI verde

### 🎬 Demo al Final del Sprint 3
Crear un proveedor, subir un Excel de lista de precios, mapear columnas, guardar la plantilla, ver la preview con un SKU desconocido, resolver la asociación, confirmar la importación.

---

## 🗓️ Sprint 4 — Compras & Recepciones

**Duración:** 5 días  
**Historias:** US-15, US-16, US-17  
**Estimación Total:** ~6 días

### 🎯 Sprint Goal
El Administrador puede emitir órdenes de compra, registrar la recepción total o parcial de mercadería (con conversión automática a unidades base) y hacer seguimiento de los backorders pendientes.

---

### US-15 — Crear y Gestionar Órdenes de Compra *(2 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `PurchaseOrder` y `PurchaseOrderItem`
2. **[Backend]** `PurchaseOrdersModule`: `POST /purchase-orders` (crea en estado BORRADOR), `PATCH /purchase-orders/:id/emit` (→ EMITIDA), `PATCH /purchase-orders/:id/cancel`
3. **[Backend]** `GET /purchase-orders` con filtros (proveedor, estado, fecha) + `GET /purchase-orders/:id` con ítems
4. **[Frontend]** Página `/purchases/orders/new`: formulario de OC. Select de proveedor, tabla dinámica de ítems (producto via `ProductSearchInput`, unidad de compra, cantidad, costo esperado). Footer con total estimado
5. **[Frontend]** Página `/purchases/orders`: lista de OCs con filtros. Acciones: Ver Detalle, Emitir, Cancelar
6. **[QA]** Test: OC emitida no puede ser editada, OC cancelada no puede ser emitida

---

### US-16 — Registrar Recepción de Mercadería y Conversión a Stock Base *(2.5 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `GoodsReceipt` y `GoodsReceiptItem`
2. **[Backend]** `POST /purchase-orders/:id/receipts`: crea un `GoodsReceipt`. Para cada ítem recibido: calcula `receivedQtyBaseUnits = receivedQtyPurchaseUnit × conversionFactor` y llama a `StockService.recordMovement(ENTRADA)`. Asigna costo provisional
3. **[Backend]** Actualización automática de `PurchaseOrderItem.receivedQty` y estado de OC (PARCIAL si `pendingQty > 0`, COMPLETADA si `pendingQty = 0`)
4. **[Frontend]** Página `/purchases/orders/:id/receive`: formulario de recepción. Muestra ítems pendientes de la OC, permite ingresar cantidad recibida por ítem (≤ pendiente), campo de número de remito
5. **[QA]** Test: recibir 5 de una OC de 10 → OC queda en PARCIAL, stock aumenta en 5×factor, `pendingQty = 5`

---

### US-17 — Recepción Parcial y Gestión de Backorders *(1.5 días)*

**Tareas:**
1. **[Backend]** `GET /purchase-orders/pending`: lista de OCs en estado PARCIAL con detalle de `pendingQty` por ítem por proveedor
2. **[Backend]** Soporte para múltiples recepciones sobre la misma OC (acumulativo)
3. **[Frontend]** Página `/purchases/backorders`: tabla de OCs parciales agrupadas por proveedor. Columnas: Proveedor, N° OC, Productos Pendientes, Qty Pendiente Total, Días Desde Emisión
4. **[Frontend]** Desde la tabla de backorders: link directo a "Registrar Nueva Recepción" de esa OC
5. **[QA]** Test: completar en 3 recepciones parciales una OC de 30 unidades → en la tercera la OC pasa a COMPLETADA

---

### ✅ Definition of Done — Sprint 4
- [ ] Flujo OC completo: BORRADOR → EMITIDA → recepciones parciales → COMPLETADA
- [ ] Stock se actualiza correctamente con cada recepción
- [ ] Panel de backorders operativo
- [ ] CI verde

### 🎬 Demo al Final del Sprint 4
Crear OC a un proveedor, emitirla, registrar recepción parcial (ver stock aumentar en tiempo real), ver el backorder, completar la recepción.

---

## 🗓️ Sprint 5 — Facturas de Proveedores, Costos & Tolerancias

**Duración:** 5 días  
**Historias:** US-18, US-19, US-20  
**Estimación Total:** ~7 días

### 🎯 Sprint Goal
El sistema concilia facturas de proveedor contra recepciones, aplica la tolerancia configurable, bloquea facturas observadas hasta autorización, y ejecuta el algoritmo de ajuste retroactivo de costos.

---

### US-18 — Conciliación Recepción ↔ Factura de Proveedor *(2.5 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `SupplierInvoice` y `SupplierInvoiceItem`
2. **[Backend]** `POST /supplier-invoices`: crea factura asociada a un `GoodsReceipt`. Para cada ítem: calcula `invoicedQty vs receivedQty`
   - Si `invoicedQty > receivedQty` → línea en estado `OBSERVADA`
   - Si `invoicedQty < receivedQty` → diferencia queda como `PENDIENTE_FACTURACION`
3. **[Backend]** Estado global de la factura: BORRADOR → VALIDANDO → OBSERVADA | AUTORIZADA
4. **[Frontend]** Página `/purchases/supplier-invoices/new`: seleccionar recepción, ingresar datos fiscales (N° factura, fecha), tabla de ítems con comparativa qty recibida vs qty facturada + diferencia resaltada
5. **[Frontend]** Página `/purchases/supplier-invoices`: lista con badge de estado. Filtro por estado OBSERVADA para atención prioritaria
6. **[QA]** Test: factura con cantidad > recepción en una línea → esa línea queda OBSERVADA, factura queda OBSERVADA

---

### US-19 — Tolerancia de Costos y Facturas Observadas *(1.5 días)*

**Tareas:**
1. **[Backend]** Leer `costTolerancePercentage` desde `SystemConfig` (entidad de configuración de US-46, stub por ahora con valor por defecto 5%)
2. **[Backend]** En `SupplierInvoiceService`: si `|∆Costo%| > tolerancia` → estado `OBSERVADA` con `disputeReason` = "Variación de costo supera tolerancia configurada"
3. **[Backend]** `PATCH /supplier-invoices/:id/authorize`: solo ADMINISTRADOR. Mueve factura de OBSERVADA → AUTORIZADA. Registra en AuditLog
4. **[Backend]** `PATCH /supplier-invoices/:id/reject`: solo ADMINISTRADOR. Rechaza la factura con motivo
5. **[Frontend]** En el detalle de una factura OBSERVADA: banner de alerta con diferencia calculada, porcentaje vs tolerancia, botones "Autorizar" y "Rechazar" (solo visible para ADMINISTRADOR)
6. **[QA]** Test: diferencia de 6% con tolerancia de 5% → factura OBSERVADA. Diferencia de 4% → factura pasa a AUTORIZADA directamente

---

### US-20 — Algoritmo de Ajuste Retroactivo de Costos *(3 días)*

**Tareas:**
1. **[Backend]** Al confirmar una `SupplierInvoice` (AUTORIZADA → CONFIRMADA): lanzar el algoritmo de ajuste
2. **[Backend]** Algoritmo:
   ```
   ∆CostUnit = realCostUnit - provisionalCostUnit
   stockEnMano = Stock.currentBaseStock (al momento del ajuste)
   unidadesVendidas = totalRecibidas - stockEnMano
   
   revaluacionInventario = stockEnMano × ∆CostUnit
   ajusteCOGS = unidadesVendidas × ∆CostUnit
   ```
3. **[Backend]** Crear entidad `SupplierCostAdjustment` con los resultados. Actualizar `Product.costNet` al costo real definitivo. Generar entrada en `StockMovement` de tipo `AJUSTE` si hay revalorización de inventario
4. **[Backend]** Disparar creación de `PriceReview` (pendiente) para todos los productos afectados → notificación a la Bandeja de Revisión de Precios
5. **[Frontend]** Vista de detalle de la factura CONFIRMADA: sección "Ajuste de Costos" con tabla: Producto, ∆Costo Unitario, Revalorización Inventario ($), Ajuste COGS ($)
6. **[QA]** Test: recibir 100 unidades a $10, vender 30, factura llega con costo real $11 → revalorización = 70 × $1 = $70, COGS ajuste = 30 × $1 = $30

---

### ✅ Definition of Done — Sprint 5
- [ ] Conciliación recepción vs factura con casos C y D del spec
- [ ] Tolerancia de costos configurable funcional
- [ ] Flujo de autorización de facturas observadas completo
- [ ] Algoritmo de ajuste retroactivo correcto verificado con tests de integración
- [ ] PriceReview generado automáticamente tras ajuste
- [ ] CI verde

### 🎬 Demo al Final del Sprint 5
Registrar factura de proveedor con diferencia de costo del 8% (supera tolerancia), ver que queda OBSERVADA, autorizarla, confirmarla, ver el ajuste retroactivo calculado.

---

## 🗓️ Sprint 6 — Precios & Clientes

**Duración:** 5 días  
**Historias:** US-21, US-22, US-23, US-24  
**Estimación Total:** ~5.5 días

### 🎯 Sprint Goal
El sistema sugiere precios automáticamente según la jerarquía de markups, el Administrador aprueba o rechaza los cambios en la Bandeja de Revisión, y se pueden gestionar clientes con precios especiales por producto.

---

### US-21 — Cálculo de Precio Sugerido y Jerarquía de Markups *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `MarkupConfiguration` (level: PRODUCT | CATEGORY | GLOBAL, targetId nullable, markupPercentage)
2. **[Backend]** `MarkupService.getEffectiveMarkup(productId)`: busca en orden PRODUCT → CATEGORY → GLOBAL
3. **[Backend]** `MarkupService.calculateSuggestedPrice(productId)`: `costNet × (1 + markup)`
4. **[Backend]** `GET /markups`: lista configuraciones. `POST/PATCH /markups` para gestionar. `GET /products/:id/suggested-price`: devuelve el cálculo con detalle del markup aplicado
5. **[Frontend]** Página `/admin/markups`: tabla de configuraciones por nivel. Botón de agregar markup por categoría o producto específico
6. **[QA]** Test: markup de producto (25%) tiene prioridad sobre categoría (20%) y global (15%)

---

### US-22 — Bandeja de Revisión de Precios *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `PriceReview` (productId, oldCostNet, newCostNet, oldPriceNet, suggestedPriceNet, status: PENDIENTE | APROBADO | RECHAZADO | POSPUESTO, decisionUserId, decidedAt)
2. **[Backend]** `PATCH /price-reviews/:id/approve`: actualiza `Product.activePriceNet` al precio aprobado (o al customPrice si el admin lo modifica). Registra en AuditLog
3. **[Backend]** `PATCH /price-reviews/:id/reject` y `PATCH /price-reviews/:id/postpone`
4. **[Frontend]** Página `/prices/review`: tabla de revisiones PENDIENTES. Por fila: Producto, Costo Ant/Nuevo, Precio Actual, Precio Sugerido, ∆%. Acciones: Aprobar / Aprobar con precio custom / Rechazar / Posponer
5. **[Frontend]** Badge en sidebar con count de revisiones pendientes
6. **[QA]** Test: aprobar una revisión actualiza `Product.activePriceNet`, rechazar no lo modifica

---

### US-23 — CRUD de Clientes y Límites de Crédito *(1 día)*

**Tareas:**
1. **[Backend]** Migración + entidad `Customer` (businessName, dniCuit unique, taxCondition, address, phone, email, creditLimit, specialDiscountPercentage)
2. **[Backend]** `CustomersModule`: CRUD, validación CUIT único, soft-delete
3. **[Frontend]** Página `/customers`: tabla con búsqueda + badge de límite de crédito. Formulario modal o página de detalle
4. **[QA]** Test: CUIT duplicado rechazado

---

### US-24 — Precios Especiales y Descuentos por Cliente *(1.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `CustomerSpecialPrice` (customerId, productId, specialPriceNet)
2. **[Backend]** `CustomerPricingService.getFinalPrice(customerId, productId)`: jerarquía → `CustomerSpecialPrice` → `activePriceNet` con `specialDiscountPercentage` → `activePriceNet`
3. **[Backend]** `GET /customers/:id/special-prices` + `POST/DELETE /customers/:id/special-prices/:productId`
4. **[Frontend]** Sub-sección en detalle de cliente: tabla de "Precios Especiales" con `ProductSearchInput` para agregar productos con precio especial
5. **[QA]** Test: precio especial ($100) tiene prioridad sobre precio de catálogo ($120) y descuento especial del cliente (10%)

---

### ✅ Definition of Done — Sprint 6
- [ ] Jerarquía de markups correcta verificada con tests
- [ ] Bandeja de revisión de precios operativa con las 4 acciones
- [ ] CRUD de clientes con límite de crédito
- [ ] Precios especiales por cliente funcionales
- [ ] CI verde

### 🎬 Demo al Final del Sprint 6
Mostrar cómo un ajuste de costo genera automáticamente una revisión pendiente en la bandeja, aprobarla con precio customizado, luego mostrar un cliente con precio especial diferente al de catálogo.

---

## 🗓️ Sprint 7 — Punto de Venta & Devoluciones

**Duración:** 5 días  
**Historias:** US-25, US-28  
**Estimación Total:** ~5 días

### 🎯 Sprint Goal
El Vendedor puede cargar y confirmar una venta completa (contado o crédito) con descuento de stock automático. El ARCA queda como stub (se integra en el Sprint 8). Las devoluciones con control de calidad están operativas.

---

### US-25 — Punto de Venta y Validación Transaccional de Venta *(3 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `Sale` y `SaleItem`
2. **[Backend]** `POST /sales`: transacción TypeORM con `QueryRunner`:
   - Insertar `Sale` en estado BORRADOR
   - Para cada ítem: `SELECT stock FOR UPDATE` → validar disponibilidad → insertar `SaleItem`
   - Si tiene stock: insertar `StockMovement(SALIDA)` + actualizar `Stock.currentBaseStock`
   - Si `isCreditSale`: validar que `isInvoiced = true` (sino rechazar con error descriptivo)
   - Insertar `FiscalDocument { status: PENDIENTE_FACTURACION }` como stub
   - Sale pasa a estado CONFIRMADA
   - COMMIT
3. **[Backend]** `GET /sales` con filtros fecha/cliente/estado + `GET /sales/:id`
4. **[Frontend]** Página `/sales/new` (POS):
   - Panel izquierdo: buscador de productos + tabla de ítems del carrito (cantidad editable, precio unitario, descuento por ítem)
   - Panel derecho: select de cliente, resumen con subtotal/IVA/total, selección de medio de pago, toggle "Requiere Factura", toggle "Venta a Crédito"
   - Botón "Confirmar Venta" → llama a la API → muestra resultado con N° de venta
5. **[Frontend]** Validación en UI: si "Crédito" está activo, "Requiere Factura" se fuerza a true y no puede desmarcarse
6. **[Frontend]** Página `/sales`: historial de ventas con filtros
7. **[QA]** Tests: venta contado sin factura (OK), venta crédito sin factura (rechazada), venta con stock insuficiente en un ítem (rechazada completa)

---

### US-28 — Devoluciones de Clientes y Control de Calidad *(2 días)*

**Tareas:**
1. **[Backend]** `POST /sales/:id/returns`: body `{ items: [{ saleItemId, quantityBaseUnits, qualityResult: APTO | NO_APTO, reason }] }`
   - Si APTO: `StockService.recordMovement(DEVOLUCION)` → stock disponible + stub de Nota de Crédito (real en Sprint 8)
   - Si NO_APTO: crear registro en `QuarantineStock`
2. **[Backend]** `GET /sales/:id/returns`: historial de devoluciones de una venta
3. **[Frontend]** En detalle de venta CONFIRMADA: sección "Registrar Devolución". Select de ítems con cantidad a devolver y resultado de calidad
4. **[Frontend]** Badge en los ítems devueltos no aptos indicando que están en Cuarentena (con link)
5. **[QA]** Test: devolver 5 unidades APTAS → stock aumenta 5. Devolver 3 NO APTAS → van a cuarentena, stock no cambia

---

### ✅ Definition of Done — Sprint 7
- [ ] Venta contado + crédito funcionales con todas las validaciones del spec
- [ ] Stock se descuenta correctamente en cada venta
- [ ] Devoluciones con bifurcación de calidad operativa
- [ ] Cuarentena recibe ítems no aptos
- [ ] CI verde

### 🎬 Demo al Final del Sprint 7
Cargar una venta de 3 productos a un cliente con precio especial (crédito, con factura pendiente), confirmarla, ver el stock actualizado, procesar una devolución parcial con resultado mixto (apto + no apto).

---

## 🗓️ Sprint 8 — Integración ARCA / AFIP

**Duración:** 6 días  
**Historias:** US-26, US-27  
**Estimación Total:** ~6 días  
> ⚠️ **Sprint más crítico del proyecto.** Requiere certificado .p12 de homologación AFIP activo antes de comenzar.

### 🎯 Sprint Goal
El sistema emite comprobantes fiscales reales (Facturas A y B con CAE, PDF con QR oficial) a través de ARCA. Los dos escenarios de contingencia (pre-CAE y post-CAE) están implementados con reintentos automáticos vía BullMQ.

---

### US-26 — Integración ARCA: Emisión de Comprobantes Fiscales *(4 días)*

**Tareas:**
1. **[Backend]** `ArcaAuthService`: lee certificado `.p12`, genera el CMS firmado (XML), llama a WSAA (`LoginCms`), cachea el `Token + Sign` en Redis por 12h (TTL)
2. **[Backend]** `ArcaWsfeService`: wrapper del SOAP WSFE con métodos:
   - `FECAESolicitar(saleId)`: construye el request XML con datos de la venta, llama WSFE, parsea respuesta, devuelve `{ cae, caeExpiration }` o error
   - `FECompConsultar(tipo, puntoVenta, numero)`: consulta si ya existe el comprobante (para evitar duplicados)
3. **[Backend]** `ArcaQueue` (BullMQ): job `wsfe-emit`. Worker que:
   - Recibe `{ saleId, idempotencyKey: saleId }`
   - Llama `FECAESolicitar()`
   - En éxito: `UPDATE fiscal_documents SET cae=..., status=EMITIDO`
   - En falla: registra intento, actualiza `arcaStatus` en el documento
4. **[Backend]** Job `pdf-generate` (BullMQ): una vez emitido el CAE, genera el PDF oficial con Puppeteer. Template HTML con: datos del emisor, datos del receptor, ítems, totales, QR de AFIP
5. **[Backend]** QR AFIP: construir la URL según spec AFIP (`https://www.afip.gob.ar/fe/qr/?p={base64(json)}`), generar QR con librería `qrcode`
6. **[Backend]** `GET /sales/:id/fiscal-document`: devuelve datos del comprobante incluyendo URL del PDF
7. **[Frontend]** En detalle de venta: sección "Comprobante Fiscal" con estado (badge: EMITIDO/PENDIENTE/RECHAZADO), botón "Descargar PDF", botón "Ver QR"
8. **[QA]** Test en homologación: emitir una Factura B real, verificar que el CAE es válido, abrir el PDF generado

---

### US-27 — Manejo de Contingencias y Reconexión ARCA *(2 días)*

**Tareas:**
1. **[Backend]** Configurar BullMQ retry con backoff exponencial: `attempts: 5`, `backoff: { type: 'exponential', delay: 30000 }` (30s, 60s, 120s, 240s, 480s)
2. **[Backend]** **Escenario A (Pre-CAE):** si `FECAESolicitar` falla antes de obtener CAE → `FiscalDocument.arcaStatus = PENDIENTE_FACTURACION`. El job queda encolado para retry. La venta interna sigue CONFIRMADA
3. **[Backend]** **Escenario B (Post-CAE):** si la conexión se pierde después de que AFIP procesó pero antes de recibir respuesta → el retry llama PRIMERO a `FECompConsultar` para verificar si ya existe → si existe, toma el CAE sin re-emitir → si no existe, emite normalmente
4. **[Backend]** Tras 5 intentos fallidos: `FiscalDocument.arcaStatus = RECHAZADO`, notificar al admin (log + registro en tabla de alertas)
5. **[Backend]** `GET /sales/pending-fiscal`: lista de ventas con comprobante `PENDIENTE_FACTURACION` para seguimiento manual
6. **[Frontend]** Panel `/admin/fiscal-alerts`: tabla de comprobantes pendientes y rechazados con botón de "Reintentar Manualmente"
7. **[QA]** Test con mock de ARCA que falla las primeras 3 llamadas y tiene éxito en la 4ta → verificar que el CAE se obtiene correctamente

---

### ✅ Definition of Done — Sprint 8
- [ ] Factura A y B emitidas correctamente en ambiente de homologación AFIP
- [ ] PDF con QR oficial generado y descargable
- [ ] Retry automático BullMQ funcional (verificado con mock de fallos)
- [ ] Escenario A: venta queda CONFIRMADA aunque ARCA falle
- [ ] Escenario B: `FECompConsultar` previene duplicados
- [ ] CI verde

### 🎬 Demo al Final del Sprint 8
Hacer una venta, ver el estado "PENDIENTE_FACTURACION", ver cómo el worker procesa el job y cambia a "EMITIDO", descargar el PDF con CAE y QR, luego simular fallo de ARCA y mostrar el retry automático.

---

## 🗓️ Sprint 9 — Cuentas Corrientes, Cobranzas & Cheques

**Duración:** 6 días  
**Historias:** US-29, US-30, US-31, US-32  
**Estimación Total:** ~8.5 días

### 🎯 Sprint Goal
El sistema tiene un ledger completo de cuentas corrientes, permite registrar cobros con aplicación a facturas específicas o por antigüedad, emite recibos, y gestiona el ciclo de vida completo de cheques incluyendo la reversión transaccional por rechazo.

---

### US-29 — Cuenta Corriente de Clientes por Movimientos *(2 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `AccountReceivable` y `AccountReceivableMovement`
2. **[Backend]** Trigger post-venta: cuando `Sale` queda CONFIRMADA + `isCreditSale = true` → crear `AccountReceivable` con `originalAmount = sale.totalAmount`, `currentBalance = originalAmount`, status PENDIENTE
3. **[Backend]** `GET /customers/:id/account-receivable`: devuelve resumen (saldo total, facturas PENDIENTE/PARCIAL) + ledger de movimientos ordenados por fecha
4. **[Backend]** `GET /account-receivables`: lista global con filtros por cliente, estado, antigüedad
5. **[Frontend]** Página `/customers/:id/account`: resumen de saldo con breakdown + tabla de facturas pendientes. Botón "Registrar Cobro" (enlaza a US-30)
6. **[Frontend]** Exportación a PDF del resumen de cuenta corriente
7. **[QA]** Test: confirmar 3 ventas crédito al mismo cliente → `currentBalance = suma de las 3`

---

### US-30 — Cobranzas, Aplicación de Pagos y Emisión de Recibos *(2.5 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `Payment`, `PaymentAllocation`, `Receipt`
2. **[Backend]** `POST /payments`: recibe `{ customerId, totalAmount, paymentDate, items: [{type: EFECTIVO|TRANSFERENCIA|CHEQUE, amount, checkId?}], allocations: [{accountReceivableId, amount}] | { mode: AGE_CASCADE } }`
   - Valida que `sum(items.amount) = totalAmount`
   - Aplica las allocations: `AccountReceivable.currentBalance -= allocated`. Si `currentBalance = 0` → status CANCELADO
   - Crea los `AccountReceivableMovement(PAGO)` por cada factura implicada
   - Genera `Receipt` automáticamente
3. **[Backend]** `GET /receipts/:id/pdf`: genera PDF del recibo con Puppeteer
4. **[Frontend]** Modal/Página de cobro: select de cliente, tabla de facturas pendientes con checkbox para aplicación dirigida (o toggle "Por antigüedad"), formas de pago con importes, total cobrado vs a aplicar con validación
5. **[QA]** Test: pago de $1500 aplicado dirigido a 2 facturas ($1000 y $500) → ambas quedan en CANCELADO

---

### US-31 — Ciclo de Vida Completo de Cheques *(2 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `Check`
2. **[Backend]** Los cheques se registran al momento del cobro (en `POST /payments`): si un ítem de pago es tipo CHEQUE → crear `Check { status: RECIBIDO }`
3. **[Backend]** `PATCH /checks/:id/to-cartera`: RECIBIDO → EN_CARTERA
4. **[Backend]** `PATCH /checks/:id/deposit`: EN_CARTERA → DEPOSITADO
5. **[Backend]** `PATCH /checks/:id/endorse`: EN_CARTERA → ENDOSADO (con `endorsedToSupplierId`)
6. **[Frontend]** Página `/treasury/checks`: tabla de cheques con filtros por estado y fecha de vencimiento. Acciones por fila según estado actual. Badge de cheques a vencer en 7 días
7. **[QA]** Test: transición inválida (ej. DEPOSITADO → EN_CARTERA) debe ser rechazada

---

### US-32 — Reversión Transaccional por Cheque Rechazado *(2 días)*

**Tareas:**
1. **[Backend]** `PATCH /checks/:id/reject`: transacción TypeORM atómica:
   - `Check.status → RECHAZADO`
   - Para cada `AccountReceivable` que fue cancelada por ese pago: `currentBalance = originalAmount`, `status → PENDIENTE`
   - Para cada `AccountReceivableMovement(PAGO)` asociado: crear movimiento inverso `REVERSION_CHEQUE`
   - `Payment.status → REVERTIDO`
   - Registrar todo en AuditLog
2. **[Backend]** Si el cheque fue endosado a proveedor: registrar nota de alerta manual (no hay integración bancaria automática)
3. **[Frontend]** En detalle de cheque EN_CARTERA o DEPOSITADO: botón "Registrar Rechazo" con modal de confirmación mostrando el impacto (facturas que se reabren, saldo que se incrementa)
4. **[QA]** Test: cheque de $1000 rechazado → la/s factura/s vuelven a PENDIENTE con el saldo original, `AccountReceivableMovement` tiene el movimiento de reversión

---

### ✅ Definition of Done — Sprint 9
- [ ] Ledger de cuenta corriente correcto para al menos 5 movimientos de prueba
- [ ] Cobro con aplicación dirigida y por antigüedad funcionales
- [ ] Recibo generado en PDF
- [ ] Ciclo de cheques completo (5 transiciones de estado)
- [ ] Reversión de cheque rechazado atómica verificada con test de integración
- [ ] CI verde

### 🎬 Demo al Final del Sprint 9
Registrar un cobro con cheque para cancelar 2 facturas, ver el recibo PDF, luego rechazar el cheque y mostrar cómo las facturas vuelven a estado pendiente automáticamente.

---

## 🗓️ Sprint 10 — Tesorería, Reportes & QA Final

**Duración:** 7 días  
**Historias:** US-33, US-34, US-35–US-46  
**Estimación Total:** ~7 días

### 🎯 Sprint Goal
El sistema está completo: caja y tesorería operativas, todos los reportes exportables implementados, dashboard de KPIs funcional, configuración del sistema accesible, y el MVP pasa el QA final antes del go-live.

---

### US-33 — Caja Chica y Arqueo Físico *(1.5 días)*

**Tareas:**
1. **[Backend]** Migraciones + entidades `CashRegister` y `TreasuryMovement`
2. **[Backend]** `POST /cash-register/open`: abre caja con `openingBalance`
3. **[Backend]** `POST /cash-register/close`: recibe `actualCashBalance`, calcula diferencia, registra en AuditLog inmutable
4. **[Backend]** `POST /treasury/movements`: movimientos manuales de ingreso/egreso con motivo
5. **[Frontend]** Página `/treasury/cash-register`: estado actual de caja (abierta/cerrada), botón abrir/cerrar, formulario de arqueo con campo de monto físico contado
6. **[QA]** Test: diferencia de arqueo registrada correctamente en AuditLog

---

### US-34 — Desglose de Tesorería *(1 día)*

**Tareas:**
1. **[Backend]** `TreasuryAccount` seeds: cuentas EFECTIVO, BANCOS, CHEQUES_CARTERA. `GET /treasury/summary`: calcula saldo de cada cuenta a partir de movimientos
2. **[Frontend]** Página `/treasury`: 3 cards con saldos (Efectivo, Bancos/Transferencias, Cheques en Cartera) + tabla de movimientos recientes con filtros

---

### US-35 — Dashboard KPIs *(0.5 días)*

**Tareas:**
1. **[Backend]** `GET /dashboard/kpis`: queries agregadas: ventas del día, ventas del mes, count de productos bajo mínimo, count de facturas observadas pendientes, count de cheques a vencer en 7 días
2. **[Frontend]** Página `/dashboard` (home): 5 KPI cards con iconos Lucide, valores prominentes y link al módulo correspondiente

---

### US-36 — Export Engine *(0.5 días)*

**Tareas:**
1. **[Backend]** `ExportService`: método `toExcel(title, columns[], rows[])` usando SheetJS, método `toPdf(htmlContent)` usando Puppeteer. Ambos devuelven `Buffer`
2. **[Backend]** `ReportsController`: endpoint genérico `GET /reports/:type?format=excel|pdf` que delega a los services de reporte específicos y llama a `ExportService`

---

### US-37 a US-45 — Reportes Operativos *(3 días total)*

Cada reporte sigue el mismo patrón:
1. **[Backend]** Query con filtros + join necesarios → `ReportXxxService.generate(filters)`
2. **[Backend]** Endpoint `GET /reports/xxx?from=&to=&...&format=excel|pdf`
3. **[Frontend]** Página `/reports/xxx`: formulario de filtros + tabla preview con TanStack Table + botones "Exportar Excel" / "Exportar PDF"

| Historia | Nombre | Días |
|----------|--------|------|
| US-37 | Reporte de Ventas | 0.3 |
| US-38 | Reporte de Rentabilidad | 0.5 |
| US-39 | Reporte de Stock y Valorización | 0.3 |
| US-40 | Reporte de Movimientos de Stock | 0.3 |
| US-41 | Reporte de Compras | 0.3 |
| US-42 | Reporte de Aging CtaCte | 0.5 |
| US-43 | Reporte de Cobranzas y Recibos | 0.3 |
| US-44 | Reporte de Cheques | 0.3 |
| US-45 | Reporte de Facturas Observadas | 0.3 |

---

### US-46 — Configuración General del Sistema *(0.5 días)*

**Tareas:**
1. **[Backend]** Migración + entidad `SystemConfig` (key, value, updatedAt, updatedByUserId). Seed con defaults: `{ cost_tolerance_percentage: 5, arca_punto_venta: 1, issuer_razon_social: '...', issuer_cuit: '...', issuer_tax_condition: 'RESPONSABLE_INSCRIPTO' }`
2. **[Backend]** `GET /config` y `PATCH /config` (solo ADMINISTRADOR)
3. **[Frontend]** Página `/admin/config`: formulario con los parámetros editables

---

### QA Final *(~1 día)*

**Tareas:**
1. **[QA]** Smoke test completo del flujo de ventas end-to-end (Venta → Stock → ARCA → CtaCte → Cobro → Recibo)
2. **[QA]** Smoke test del flujo de compras (OC → Recepción → Factura Proveedor → Ajuste de Costos → Bandeja de Precios)
3. **[QA]** Verificar todos los reportes generan Excel/PDF sin errores
4. **[QA]** Test de regresión: ejecutar toda la suite de tests (`pnpm -r run test`)
5. **[Infra]** Deploy a producción (Hetzner CX21), Nginx + Certbot, variables de entorno de producción, certificado ARCA real
6. **[Infra]** Configurar backup automático de PostgreSQL (`pg_dump` diario via cron)
7. **[Docs]** Actualizar README con instrucciones de deploy y operación

---

### ✅ Definition of Done — Sprint 10
- [ ] Todos los reportes generan Excel y PDF descargables
- [ ] Dashboard de KPIs con datos reales
- [ ] Configuración del sistema guardando en DB
- [ ] Suite de tests completa pasando en CI
- [ ] Deploy en producción operativo
- [ ] Backup automático configurado
- [ ] Smoke test manual del flujo completo pasado

### 🎬 Demo Final (Go-Live)
Recorrido completo del sistema con datos reales del cliente: catálogo de productos importado, una venta con factura ARCA real, cobro con cheque, reporte de rentabilidad del día.

---

## Resumen Ejecutivo de Sprints

| Sprint | Nombre | Semana | Historias | Días Est. | Hito de Demo |
|--------|--------|--------|-----------|-----------|--------------|
| **S0** | Infraestructura & Scaffolding | 1 (parcial) | — | ~3 | Monorepo + Docker + CI verde |
| **S1** | Auth & Catálogo Base | 1–2 | US-01–05 | 5 | Login + CRUD Productos |
| **S2** | Motor de Stock | 2–3 | US-06–10 | 5 | Ledger + No-Negativo |
| **S3** | Proveedores & Importador | 3–4 | US-11–14 | 5 | Wizard Excel Import |
| **S4** | Compras & Recepciones | 4–5 | US-15–17 | 5 | OC + Backorder |
| **S5** | Facturas Prov. & Costos | 5–6 | US-18–20 | 5 | Ajuste Retroactivo |
| **S6** | Precios & Clientes | 6–7 | US-21–24 | 5 | Bandeja de Precios |
| **S7** | Punto de Venta | 7–8 | US-25, 28 | 5 | POS + Devoluciones |
| **S8** | Integración ARCA | 8–9 | US-26–27 | 6 | Factura A/B + CAE + PDF |
| **S9** | Cta Cte & Cheques | 9–10 | US-29–32 | 6 | Reversión cheque rechazado |
| **S10** | Tesorería, Reportes & QA | 11–12 | US-33–46 | 7 | Go-Live completo |
| | | | **Total** | **~57.5** | |

---

## Camino Crítico

```
[S0: Infra]
    |
    v
[S1: Auth + Catalogo] ---------> [S2: Stock Engine]
                                        |
                    [S3: Suppliers] ----+
                         |             |
                         v             v
                    [S4: Purchases] ----+
                                        |
                                   [S5: Costs]
                                        |
                    [S6: Prices + Customers] ----+
                                                 |
                                            [S7: POS]
                                                 |
                                           [S8: ARCA] <-- BLOQUEANTE: cert .p12
                                                 |
                                           [S9: CtaCte]
                                                 |
                                          [S10: Reports + QA + Go-Live]
```

> **Bloqueo identificado:** Sprint 8 requiere el certificado X.509 `.p12` de homologación AFIP. Gestionarlo con el cliente **antes del inicio del Sprint 7** para no bloquear el Sprint 8.

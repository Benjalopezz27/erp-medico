# Backlog Definitivo, Estimación y Plan de Sprints — ERP Distribuidora Médica

**Versión:** 1.0 — Alcance Consolidado para Desarrollo Individual  
**Modelo de Desarrollo:** Single Developer (Full-Stack Engine + UI)  
**Metodología:** Sprints Iterativos Transaccionales  
**Base de Diseño:** [Especificación Funcional v1.0](file:///c:/Desarrollo/Erp/docs/functional_specification.md) y [Modelo de Dominio v1.0](file:///c:/Desarrollo/Erp/docs/domain_model.md)

---

## 1. Resumen Ejecutivo de Estimación

* **Total de Épicas Consolidadas:** 12
* **Total de Historias de Usuario Unificadas:** 46 (Consolidadas y filtradas sin redundancias)
* **Esfuerzo Total Estimado:** ~52 Días / Hombre (Desarrollo, Pruebas Unitarias/Integración y Despliegue)
* **Duración Sugerida del Proyecto:** 10 Sprints de 1 Semana (o 5 Sprints de 2 Semanas) $\approx$ 2.5 Meses.

---

## 2. Matriz de Dependencias Técnicas y Camino Crítico

```text
[EP01: Auth & Usuarios]
        │
        ▼
[EP02: Catálogo & Unidades] ──► [EP04: Proveedores & Catálogos]
        │                                  │
        ▼                                  ▼
[EP03: Stock Ledger Engine] ◄── [EP05: Importador Excel/CSV]
        │                                  │
        ├──────────────────────────────────┘
        ▼
[EP06: Compras & Recepción] ──► [EP07: Costos & Facturas Prov] ──► [EP08: Precios & Bandeja]
        │                                                                   │
        ▼                                                                   ▼
[EP09: Clientes & Reglas] ──────────────────────────────────────────► [EP10: Ventas & ARCA Engine]
                                                                            │
                                                                            ▼
[EP12: Tesorería & Caja] ◄───── [EP11: Cta Cte, Cobros & Cheques] ◄─────────┘
```

---

## 3. Backlog Definitivo de Historias de Usuario

---

### ÉPICA 01: Autenticación, Usuarios y Permisos
**Entidades:** `User`, `AuditLog`

#### US-01 — Autenticación y Gestión de Sesión
* **Descripción:** Como usuario del sistema, quiero iniciar sesión con email y contraseña para acceder a las funcionalidades según mi rol.
* **Criterios de Aceptación:**
  * Login con JWT / Session Tokens mediante HTTPS.
  * Roles soportados: `VENDEDOR` y `ADMINISTRADOR`.
  * Redirección según rol. Mensaje de credenciales inválidas.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

#### US-02 — Administración de Usuarios y Auditoría Inmutable
* **Descripción:** Como Administrador, quiero crear, editar y desactivar usuarios, manteniendo trazabilidad de acciones sensibles.
* **Criterios de Aceptación:**
  * CRUD de usuarios. Prohibido eliminar usuarios con historial transaccional (soft-delete / `isActive = false`).
  * Registro automático en `AuditLog` para cambios de permisos, ajustes de stock y precios.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1.5 Días

---

### ÉPICA 02: Catálogo de Productos, Unidades y Conversiones
**Entidades:** `Category`, `Unit`, `Product`, `ProductUnitConversion`

#### US-03 — CRUD de Categorías y Unidades de Medida
* **Descripción:** Como Administrador, quiero gestionar las categorías y unidades de medida (Unidad, Caja, Caja Master, Bulto).
* **Criterios de Aceptación:**
  * Crear, editar y listar categorías y unidades base/presentación.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

#### US-04 — Catálogo de Productos y Factores de Conversión
* **Descripción:** Como Administrador, quiero crear y editar productos configurando sus conversiones a la unidad base.
* **Criterios de Aceptación:**
  * Registro de código interno propio, nombre, categoría, unidad base, minStock, markup inicial y costo.
  * Definición de equivalencias (ej. 1 Caja Master = 1.000 unidades base).
  * Conversión automática en UI/Backend.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 2 Días

#### US-05 — Consulta y Búsqueda de Productos
* **Descripción:** Como Vendedor/Administrador, quiero buscar productos por código interno, nombre o categoría para conocer stock y precio.
* **Criterios de Aceptación:**
  * Buscador rápido con debounce / autómatas de búsqueda.
  * Muestra stock disponible, unidad base y precio activo.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

---

### ÉPICA 03: Motor de Stock e Inventario Ledger
**Entidades:** `Stock`, `StockMovement`, `QuarantineStock`

#### US-06 — Ledger Transaccional Inmutable de Stock
* **Descripción:** Como sistema, quiero registrar todo movimiento de stock en un ledger inmutable para garantizar la trazabilidad de inventario.
* **Criterios de Aceptación:**
  * `StockMovement` guarda: Fecha, Producto, Tipo (`ENTRADA`, `SALIDA`, `MERMA`, `AJUSTE`, `DEVOLUCION`), Cantidad Base, Stock Ant/Post, Motivo, Referencia, Usuario.
  * Actualización atómica en la tabla `Stock`.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2 Días

#### US-07 — Backend-Enforcement de Stock No Negativo
* **Descripción:** Como Administrador, quiero que el backend impida cualquier operación que deje el stock por debajo de cero.
* **Criterios de Aceptación:**
  * Validación estricta en controladores y servicios backend (`POST /sales`, movimientos manuales).
  * Bloqueo a nivel base de datos (`SELECT FOR UPDATE`). Si `Stock < CantidadRequested` $\rightarrow$ Lanza `InsufficientStockException`.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 1.5 Días

#### US-08 — Movimientos Manuales y Alertas de Stock Bajo
* **Descripción:** Como Administrador, quiero registrar entradas/salidas manuales justificadas y visualizar productos con stock bajo el mínimo.
* **Criterios de Aceptación:**
  * Formulario de ajuste manual (Motivo obligatorio).
  * Indicador visual destacado y reporte de productos donde `Stock <= MinStock`.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1 Día

#### US-09 — Carga Inicial Masiva de Inventario
* **Descripción:** Como Administrador, quiero realizar la carga inicial del inventario físico mediante una plantilla Excel/CSV.
* **Criterios de Aceptación:**
  * Importación controlada de plantilla (`Código Interno | Cantidad Base`).
  * Generación automática del movimiento inicial en el ledger.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

#### US-10 — Gestión de Stock Retenido / Cuarentena
* **Descripción:** Como Administrador, quiero gestionar los productos devueltos no aptos en una ubicación de cuarentena aislada del stock disponible.
* **Criterios de Aceptación:**
  * Registro en `QuarantineStock`. No computa como stock disponible para venta.
  * Resoluciones permitidas: `Merma`, `Devolución a Proveedor`, `Reingreso Autorizado`.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

---

### ÉPICA 04: Proveedores y Catálogos Externos
**Entidades:** `Supplier`, `SupplierProduct`

#### US-11 — CRUD de Proveedores
* **Descripción:** Como Administrador, quiero registrar y administrar los datos fiscales y comerciales de los proveedores.
* **Criterios de Aceptación:**
  * Campos: Razón social, CUIT, Dirección, Teléfono, Email, WhatsApp, Condición Fiscal.
  * Acceso directo a enlaces de WhatsApp (`wa.me`) y mailto.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

#### US-12 — Diccionario de Códigos Producto ↔ Proveedor
* **Descripción:** Como Administrador, quiero asociar productos internos con los SKUs externos de cada proveedor.
* **Criterios de Aceptación:**
  * 1 Producto Interno $\leftrightarrow$ N Registros `SupplierProduct`.
  * Guarda: Código Proveedor, Descripción Proveedor, Unidad Compra, Factor Conversión, Costo Habitual, Indicador Habitual.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

---

### ÉPICA 05: Importador Configurable de Archivos de Proveedores
**Entidades:** `SupplierImportTemplate`

#### US-13 — Subida, Mapeo Dinámico y Plantillas por Proveedor
* **Descripción:** Como Administrador, quiero subir un Excel/CSV de un proveedor, configurar su mapeo de columnas y guardarlo como plantilla reusable.
* **Criterios de Aceptación:**
  * Asignación dinámica de columnas (Código, Descripción, Cantidad, Precio, Unidad).
  * Guardado y edición de plantillas asociadas al proveedor.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 3 Días

#### US-14 — Previsualización, Validaciones y Resolución de Códigos Desconocidos
* **Descripción:** Como Administrador, quiero previsualizar la importación, validar inconsistencias y vincular productos no reconocidos antes de procesar.
* **Criterios de Aceptación:**
  * Detección de tipos inválidos, unidades desconocidas y precios erróneos.
  * Interfaz de resolución para vincular SKUs externos nuevos con el catálogo interno.
  * Prohibido modificar stock/costos directamente sin confirmación manual.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2.5 Días

---

### ÉPICA 06: Compras, Recepción y Backorders
**Entidades:** `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptItem`

#### US-15 — Crear y Gestionar Órdenes de Compra
* **Descripción:** Como Administrador, quiero emitir órdenes de compra a proveedores especificando ítems, unidades y costos esperados.
* **Criterios de Aceptación:**
  * Estados: `BORRADOR` $\rightarrow$ `EMITIDA` $\rightarrow$ `PARCIAL` $\rightarrow$ `COMPLETADA`.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 2 Días

#### US-16 — Registrar Recepción de Mercadería y Conversión a Stock Base
* **Descripción:** Como Administrador, quiero registrar la mercadería recibida actualizando automáticamente el stock ledger en unidades base.
* **Criterios de Aceptación:**
  * Ingreso según `GoodsReceipt`. Conversión implícita a unidades base.
  * Asignación de Costo Provisional.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2.5 Días

#### US-17 — Recepción Parcial y Gestión de Backorders
* **Descripción:** Como Administrador, quiero recepcionar entregas parciales y mantener el saldo pendiente en seguimiento.
* **Criterios de Aceptación:**
  * `PendingQty = OrderedQty - ReceivedQty`. Si `PendingQty > 0` $\rightarrow$ Estado `PARCIAL`.
  * Panel de consulta de pendientes por proveedor.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

---

### ÉPICA 07: Facturas de Proveedores, Tolerancias y Ajuste de Costos
**Entidades:** `SupplierInvoice`, `SupplierInvoiceItem`, `SupplierCostAdjustment`

#### US-18 — Conciliación Recepción ↔ Factura de Proveedor
* **Descripción:** Como Administrador, quiero registrar la factura del proveedor y conciliarla contra la mercadería recibida.
* **Criterios de Aceptación:**
  * Caso `Factura > Recepción`: Bloqueo de línea y estado `OBSERVADA`.
  * Caso `Factura < Recepción`: Remanente queda como `Pendiente de Facturación`.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2.5 Días

#### US-19 — Tolerancia de Costos y Facturas Observadas/En Disputa
* **Descripción:** Como Administrador, quiero que las diferencias de costos superiores a la tolerancia bloqueen la factura hasta mi autorización.
* **Criterios de Aceptación:**
  * Si $\Delta\text{Costo} > \text{Tolerancia Configurada}$ $\rightarrow$ Estado `OBSERVADA` (no genera deuda en Cta Cte).
  * Flujo de Autorización / Rechazo manual por Administrador.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

#### US-20 — Algoritmo de Ajuste Retroactivo de Costos e Inventario
* **Descripción:** Como sistema, quiero redistribuir las diferencias entre costo provisional y definitivo afectando la valorización de inventario y el COGS histórico.
* **Criterios de Aceptación:**
  * Proporción sobre `Stock Restante` $\rightarrow$ Revalorización de Inventario.
  * Proporción sobre `Stock Vendido` $\rightarrow$ Ajuste de Costo de Ventas (COGS) en período.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 3 Días

---

### ÉPICA 08: Precios y Bandeja de Revisión
**Entidades:** `MarkupConfiguration`, `PriceReview`

#### US-21 — Cálculo de Precio Sugerido y Jerarquía de Markups
* **Descripción:** Como sistema, quiero calcular precios sugeridos según costo neto y jerarquía de markups (Producto $\rightarrow$ Categoría $\rightarrow$ Global).
* **Criterios de Aceptación:**
  * $\text{Precio Sugerido} = \text{Costo Neto} \times (1 + \text{Markup})$. Excluye IVA.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

#### US-22 — Bandeja de Revisión de Precios (Aprobación Manual Obligatoria)
* **Descripción:** Como Administrador, quiero revisar los cambios de costos y decidir si aplico, modifico o pospongo el precio sugerido.
* **Criterios de Aceptación:**
  * Estado `REVISIÓN PENDIENTE`. Prohibido cambiar precios al cliente automáticamente.
  * Opciones: Aprobar, Modificar manualmente, Mantener actual, Posponer.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

---

### ÉPICA 09: Clientes y Condiciones Comerciales
**Entidades:** `Customer`, `CustomerSpecialPrice`

#### US-23 — CRUD de Clientes y Límites de Crédito
* **Descripción:** Como Vendedor/Administrador, quiero administrar clientes, sus datos fiscales y su límite de crédito.
* **Criterios de Aceptación:**
  * Campos: Nombre, DNI/CUIT, Condición Fiscal, Dirección, Teléfono, Email, Límite Crédito.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

#### US-24 — Precios Especiales y Descuentos por Cliente
* **Descripción:** Como Administrador, quiero configurar precios especiales y porcentajes de descuento particulares por cliente.
* **Criterios de Aceptación:**
  * Jerarquía de Precio: `Precio Especial Cliente` $\rightarrow$ `Descuento Venta` $\rightarrow$ `Precio Final`.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

---

### ÉPICA 10: Ventas, Punto de Venta e Integración ARCA (AFIP)
**Entidades:** `Sale`, `SaleItem`, `FiscalDocument`

#### US-25 — Punto de Venta y Validación Transaccional de Venta
* **Descripción:** Como Vendedor, quiero cargar una venta validando stock, aplicando condiciones comerciales y seleccionando medios de pago.
* **Criterios de Aceptación:**
  * Venta a Crédito exige obligatoriamente Factura Fiscal. Venta Contado permite opción Sin Factura.
  * Transacción única en Backend (`Sale` + `StockDeduction` + `Payment/CtaCte`).
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 3 Días

#### US-26 — Integración ARCA: Emisión de Comprobantes Fiscales (A/B, NC/ND, Remitos)
* **Descripción:** Como sistema, quiero conectarme con ARCA (WSAA/WSFE) para emitir Facturas, Notas de Crédito/Débito y obtener CAE.
* **Criterios de Aceptación:**
  * Firma digital con certificado X.509. Formato PDF oficial imprimible con QR.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 4 Días

#### US-27 — Manejo de Contingencias y Reconexión ARCA
* **Descripción:** Como sistema, quiero gestionar caídas de comunicación con ARCA sin duplicar comprobantes ni cancelar la venta interna.
* **Criterios de Aceptación:**
  * Escenario A (Fallo Pre-CAE): Estado `PENDIENTE DE FACTURACIÓN`.
  * Escenario B (Perdida de red post-CAE): Consulta de estado previa obligatoria al reintento.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2 Días

#### US-28 — Devoluciones de Clientes y Control de Calidad
* **Descripción:** Como Vendedor/Administrador, quiero procesar devoluciones asociadas a una venta previa registrando el resultado de calidad.
* **Criterios de Aceptación:**
  * Generación de Nota de Crédito.
  * Producto Apto $\rightarrow$ Retorna a Stock Disponible. Producto No Apto $\rightarrow$ Pasa a Cuarentena.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2 Días

---

### ÉPICA 11: Cuentas Corrientes, Cobranzas y Cheques
**Entidades:** `AccountReceivable`, `AccountReceivableMovement`, `Payment`, `PaymentAllocation`, `Receipt`, `Check`

#### US-29 — Cuenta Corriente de Clientes por Movimientos
* **Descripción:** Como Administrador, quiero consultar el estado de cuenta y saldo de un cliente reconstruido por movimientos.
* **Criterios de Aceptación:**
  * Ledger: `Facturas (+)`, `Pagos (-)`, `Notas Crédito (-)`. Exportación a PDF de Resumen de Cuenta.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 2 Días

#### US-30 — Cobranzas, Aplicación de Pagos y Emisión de Recibos
* **Descripción:** Como Administrador, quiero registrar cobros aplicándolos a facturas (específicas o por antigüedad) y emitir el recibo.
* **Criterios de Aceptación:**
  * Aplicación Dirigida o Cascada Automática por Antigüedad.
  * Generación e impresión de Recibo formal obligatoria.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2.5 Días

#### US-31 — Ciclo de Vida Completo de Cheques
* **Descripción:** Como Administrador, quiero registrar cheques recibidos y gestionar sus estados (Cartera, Depósito, Endoso).
* **Criterios de Aceptación:**
  * Registro de Banco, Número, Monto, Fechas. Cambio a `DEPOSITADO` o `ENDOSADO`.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 2 Días

#### US-32 — Reversión Transaccional por Cheque Rechazado
* **Descripción:** Como sistema, quiero revertir el cobro y reinstaurar la deuda al cliente cuando un cheque es rechazado.
* **Criterios de Aceptación:**
  * Transacción atómica: Cheque $\rightarrow$ `RECHAZADO`, Reabrir Facturas $\rightarrow$ `PENDIENTE`, Incrementar Saldo Cta Cte.
* **Prioridad:** Must | **Complejidad:** 🔴 Alta | **Estimación:** 2 Días

---

### ÉPICA 12: Tesorería, Caja y Reportes Operativos
**Entidades:** `CashRegister`, `TreasuryAccount`, `TreasuryMovement`

#### US-33 — Caja Chica y Arqueo Físico
* **Descripción:** Como Administrador, quiero realizar el arqueo de caja comparando el saldo esperado con el dinero contado.
* **Criterios de Aceptación:**
  * Log inmutable de `Diferencia de Arqueo`. Registros manuales de ingresos/egresos.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 1.5 Días

#### US-34 — Desglose de Tesorería (Efectivo, Bancos, Cheques)
* **Descripción:** Como Administrador, quiero visualizar el saldo consolidado dividido por canal de tesorería.
* **Criterios de Aceptación:**
  * Vista consolidada: `Efectivo`, `Bancos / Transferencias`, `Cheques en Cartera`.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 1 Día

#### US-35 — Dashboard de KPIs Ejecutivos
* **Descripción:** Como Administrador, quiero ver un panel inicial con los indicadores clave del negocio al día.
* **Criterios de Aceptación:**
  * Muestra: Total ventas del día y del mes, stock bajo mínimo (cantidad de productos), facturas de proveedor observadas pendientes, cheques a vencer en los próximos 7 días.
  * Los valores son clickeables y navegan al módulo correspondiente.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 0.5 Días

#### US-36 — Infraestructura Compartida de Exportación (Export Engine)
* **Descripción:** Como sistema, quiero tener un servicio centralizado para exportar datos en formato Excel y PDF reutilizable por todos los módulos de reportes.
* **Criterios de Aceptación:**
  * Servicio NestJS (`ExportService`) con métodos `toExcel(data, columns)` y `toPdf(htmlTemplate)`.
  * El frontend descarga el archivo directamente desde el endpoint.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.5 Días

#### US-37 — Reporte de Ventas por Período
* **Descripción:** Como Administrador, quiero generar un reporte de ventas filtrado por fecha y cliente.
* **Criterios de Aceptación:**
  * Filtros: Fecha desde/hasta, cliente (opcional), medio de pago (opcional).
  * Columnas: Fecha, N° Venta, Cliente, Subtotal Neto, IVA, Total, Estado de facturación.
  * Exportable a Excel y PDF.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-38 — Reporte de Rentabilidad por Producto
* **Descripción:** Como Administrador, quiero analizar el margen de cada producto en un período.
* **Criterios de Aceptación:**
  * Filtros: Fecha, categoría, producto.
  * Columnas: Producto, Unidades Vendidas, Costo Total, Venta Total, Margen Bruto ($), Margen (%).
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 0.5 Días

#### US-39 — Reporte de Stock Actual y Valorización
* **Descripción:** Como Administrador, quiero ver el inventario actualizado con su valorización al costo.
* **Criterios de Aceptación:**
  * Filtros: Categoría, estado (activo/inactivo), solo bajo mínimo.
  * Columnas: Código, Producto, Stock Actual (ud base), Stock Mínimo, Costo Unitario, Valorización Total.
  * Total de valorización al pie del reporte.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-40 — Reporte de Movimientos de Stock por Período
* **Descripción:** Como Administrador, quiero consultar el historial de movimientos del ledger de stock.
* **Criterios de Aceptación:**
  * Filtros: Fecha desde/hasta, producto, tipo de movimiento.
  * Columnas: Fecha, Producto, Tipo, Cantidad Base, Stock Anterior, Stock Posterior, Motivo, Usuario.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-41 — Reporte de Compras por Proveedor y Período
* **Descripción:** Como Administrador, quiero revisar las compras y recepciones por proveedor en un período.
* **Criterios de Aceptación:**
  * Filtros: Fecha, proveedor, estado de OC.
  * Columnas: N° OC, Proveedor, Fecha Emisión, Fecha Recepción, Monto Estimado, Monto Real, Estado.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-42 — Reporte de Aging de Cuentas Corrientes
* **Descripción:** Como Administrador, quiero ver el vencimiento de deudas de clientes clasificado por antigüedad.
* **Criterios de Aceptación:**
  * Filtros: Cliente, estado de deuda.
  * Columnas: Cliente, Factura, Fecha, Vencimiento, 0–30 días, 31–60 días, +60 días, Saldo Total.
  * Exportable a Excel y PDF.
* **Prioridad:** Must | **Complejidad:** 🟡 Media | **Estimación:** 0.5 Días

#### US-43 — Reporte de Cobranzas y Recibos por Período
* **Descripción:** Como Administrador, quiero ver un listado de cobros y recibos emitidos en un período.
* **Criterios de Aceptación:**
  * Filtros: Fecha, cliente, medio de pago.
  * Columnas: Fecha, N° Recibo, Cliente, Monto, Medio de Pago, Facturas Canceladas.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-44 — Reporte de Cheques en Cartera
* **Descripción:** Como Administrador, quiero ver el estado de los cheques recibidos y sus vencimientos.
* **Criterios de Aceptación:**
  * Filtros: Estado (`EN_CARTERA`, `DEPOSITADO`, `ENDOSADO`, `RECHAZADO`), fecha de vencimiento.
  * Columnas: Banco, N° Cheque, Librador, Cliente, Monto, Fecha Emisión, Fecha Vencimiento, Estado.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-45 — Reporte de Facturas de Proveedores Observadas y Pendientes
* **Descripción:** Como Administrador, quiero listar las facturas de proveedores que requieren atención.
* **Criterios de Aceptación:**
  * Filtros: Proveedor, estado (`OBSERVADA`, `PENDIENTE_FACTURACION`).
  * Columnas: Proveedor, N° Factura, Fecha, Monto, Diferencia %, Estado, Días Pendiente.
  * Exportable a Excel.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.3 Días

#### US-46 — Configuración General del Sistema
* **Descripción:** Como Administrador, quiero configurar los parámetros globales del sistema sin necesidad de modificar el código.
* **Criterios de Aceptación:**
  * Parámetros configurables: Tolerancia de diferencia de costos (%), Punto de Venta ARCA, Razón social del emisor, CUIT del emisor, Condición fiscal del emisor, Moneda operativa.
  * Cambios persistidos en base de datos. UI de configuración accesible solo para ADMINISTRADOR.
* **Prioridad:** Must | **Complejidad:** 🟢 Baja | **Estimación:** 0.5 Días

---

## 4. Plan de Sprints

> El plan de sprints detallado (Sprint 0 a Sprint 10) con goals, desglose de tareas por historia y Definition of Done por sprint se encuentra en:
> **[Plan de Sprints Detallado (v1.0)](file:///c:/Desarrollo/Erp/ERP/docs/sprint_plan.md)**

### Resumen de Sprints

| Sprint | Nombre | Historias | Días Est. | Hito |
|--------|--------|-----------|-----------|------|
| **Sprint 0** | Infraestructura & Scaffolding | — (tareas infra) | ~3 | Monorepo, Docker, CI corriendo |
| **Sprint 1** | Auth & Catálogo Base | US-01–05 | 5 | Login + CRUD Productos funcional |
| **Sprint 2** | Motor de Stock | US-06–10 | 5 | Ledger inmutable + stock no negativo |
| **Sprint 3** | Proveedores & Importador | US-11–14 | 5 | Excel import con templates |
| **Sprint 4** | Compras & Recepciones | US-15–17 | 5 | OC + recepción parcial + backorder |
| **Sprint 5** | Facturas Prov. & Costos | US-18–20 | 5 | Conciliación + ajuste retroactivo |
| **Sprint 6** | Precios & Clientes | US-21–24 | 5 | Bandeja precios + condiciones cliente |
| **Sprint 7** | Punto de Venta | US-25, 28 | 5 | POS funcional + devoluciones |
| **Sprint 8** | Integración ARCA | US-26–27 | 6 | Facturas A/B con CAE + PDF + QR |
| **Sprint 9** | Cta Cte & Cheques | US-29–32 | 6 | Ledger CtaCte + cobros + cheques |
| **Sprint 10** | Tesorería, Reportes & QA | US-33–46 | 7 | Sistema completo + go-live |

---

## 5. Estructura de Presupuesto y Esfuerzo

| Módulo / Fase | Días Estimados | Peso % |
| --- | --- | --- |
| 0. Infraestructura & Scaffolding | 3.0 Días | 5.1% |
| 1. Fundación & Auth | 4.5 Días | 7.7% |
| 2. Motor de Stock & Inventario | 7.5 Días | 12.8% |
| 3. Proveedores & Importador | 8.0 Días | 13.7% |
| 4. Compras & Recepción | 6.0 Días | 10.3% |
| 5. Costos, Tolerancias & Ajustes | 7.0 Días | 12.0% |
| 6. Precios & Clientes | 5.5 Días | 9.4% |
| 7. Ventas & ARCA Engine | 11.0 Días | 18.8% |
| 8. Cta Cte, Cheques & Tesorería | 8.5 Días | 14.5% |
| 9. Caja, Reportes & QA | 6.5 Días | 11.1% |
| **TOTAL PROYECTO** | **~57.5 Días / Hombre** | **100%** |

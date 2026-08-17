# Especificación Funcional MVP — Sistema de Gestión para Distribuidora Médica

**Versión:** 1.0 — Documento de Referencia Congelado  
**Tipo de sistema:** ERP Liviano / Gestión Comercial para Distribuidora Médica  
**Usuarios iniciales:** 4 (comparten una única computadora — acceso secuencial, no concurrente)  
**Roles:** Administrador / Vendedor  
**Locales:** 1  
**Depósitos:** 1  
**Conectividad:** Cloud Web / Internet (con contingencia manual operativa ante caídas)

---

## 1. Objetivo del Sistema

El objetivo del sistema es centralizar la gestión operativa y administrativa de la distribuidora médica, reemplazando el uso del sistema actual y reduciendo el trabajo manual asociado a:

- Control de stock.
- Registro de ventas.
- Facturación fiscal.
- Compras y recepciones.
- Gestión de proveedores y catálogos.
- Cuentas corrientes de clientes.
- Cobranzas y recibos.
- Gestión de cheques.
- Caja y tesorería.
- Control de costos y sugerencia de precios.

El principal problema a resolver es que actualmente la distribuidora mantiene productos en un sistema y realiza la facturación por separado en la web de ARCA, mientras que el stock se gestiona manualmente.

El MVP permitirá recorrer dos flujos centrales unificados:

> **Venta → Stock → Facturación ARCA → Pago / Cuenta Corriente**  
> **Compra → Recepción → Stock → Factura de Proveedor → Costo Real**

---

## 2. Objetivos Específicos

1. Conocer el stock disponible de cada producto en tiempo real.
2. Evitar vender productos sin disponibilidad (backend-enforced).
3. Registrar compras y recepción de mercadería (completa / parcial / backorder).
4. Registrar ventas y descontar stock automáticamente.
5. Emitir comprobantes fiscales desde el sistema mediante integración con ARCA.
6. Registrar ventas sin factura cuando corresponda (únicamente para contado).
7. Gestionar clientes y sus condiciones comerciales (precios especiales / descuentos).
8. Gestionar cuentas corrientes basadas en movimientos transaccionales.
9. Registrar cobros y emitir recibos obligatorios.
10. Administrar el ciclo de vida completo de cheques recibidos.
11. Gestionar proveedores y asociar sus códigos externos con el producto interno.
12. Importar archivos Excel/CSV de proveedores mediante mapeo y plantillas configurables.
13. Determinar costos reales netos de adquisición.
14. Detectar variaciones de costos superiores a la tolerancia configurable.
15. Sugerir nuevos precios de venta sin modificarlos automáticamente.
16. Gestionar caja y arqueos con desglose de tesorería.
17. Obtener reportes operativos y de rentabilidad.

---

## 3. Alcance del MVP (Módulos y Prioridad)

| Módulo                      | Prioridad |
| --------------------------- | --------- |
| Autenticación y Usuarios    | Must      |
| Productos & Categorías      | Must      |
| Stock & Inventario Ledger   | Must      |
| Proveedores & Catálogos     | Must      |
| Compras & Recepción         | Must      |
| Importación de Archivos     | Must      |
| Costos & Precios            | Must      |
| Clientes & Condiciones      | Must      |
| Ventas & Punto de Venta     | Must      |
| Facturación ARCA            | Must      |
| Cuenta Corriente            | Must      |
| Cobranzas & Recibos         | Must      |
| Cheques                     | Must      |
| Caja & Tesorería            | Must      |
| Reportes                    | Must      |
| Configuración               | Must      |
| Auditoría Técnica Inmutable | Must      |

---

## 4. Usuarios y Roles Definitivos

El sistema cuenta únicamente con **2 roles**:

### 4.1 Vendedor

- **Puede:** Consultar productos, consultar stock, registrar ventas, aplicar precios/descuentos permitidos, registrar medios de pago, emitir facturas/remitos, registrar devoluciones (sujetas a control) y consultar clientes.
- **No puede:** Modificar costos, configurar parámetros generales, gestionar usuarios, modificar configuraciones fiscales ni autorizar diferencias de costos superiores a la tolerancia.

### 4.2 Administrador

- **Puede:** Acceso completo al sistema (gestión de usuarios, productos, stock, proveedores, compras, recepciones, costos, tolerancias, autorizaciones de facturas observadas, clientes, cuentas corrientes, cobranzas, cheques, tesorería/caja, reportes, configuración e integración ARCA).

---

## 5. Productos, Unidades y Conversiones

- **Catálogo:** ~300-350 productos.
- **Campos Mínimos:** Código interno propio, Nombre, Descripción, Categoría, Unidad mínima/base, Unidades de compra disponibles, Conversiones, Stock actual, Stock mínimo, Costo actual, Markup %, Precio de venta, Estado.
- **Regla de Conversión:** El stock se almacena **exclusivamente en la unidad mínima/base**.
  - Ej. 1 Caja = 100 unidades; 1 Caja Master = 10 Cajas = 1.000 unidades.
  - Al ingresar 10 Cajas Master $\rightarrow$ el ledger incrementa $+10.000$ unidades base.

---

## 6. Stock e Inventario Ledger

- **Regla Fundamental:** **Prohibido el stock negativo.** Si `Stock Disponible < Cantidad Solicitada` $\rightarrow$ Operación rechazada en Backend (`POST /sales`).
- **Historial Inmutable (StockLedger):** Todo movimiento registra `Fecha`, `Producto`, `TipoMovimiento` (`ENTRADA`, `SALIDA`, `MERMA`, `AJUSTE`, `DEVOLUCION`), `CantidadBase`, `StockAnterior`, `StockPosterior`, `Motivo`, `ReferenciaDocumento`, `Usuario`.
- **Stock Mínimo:** Alerta automática cuando `Stock Actual <= Stock Mínimo`.
- **Carga Inicial Masiva:** Importación mediante plantilla controlada (`Código Interno | Cantidad`) tras inventario físico.

---

## 7. Proveedores, Catálogos e Importación Flexible

- **Relación Producto-Proveedor:** 1 Producto Interno $\leftrightarrow$ N Proveedores (guarda Código Externo, Descripción del Proveedor, Unidad de Compra, Factor de Conversión, Costo Habitual e Indicador de Proveedor Habitual).
- **Importador Excel/CSV:**
  1. Subir archivo $\rightarrow$ 2. Seleccionar proveedor $\rightarrow$ 3. Detectar/mapear columnas $\rightarrow$ 4. Previsualizar $\rightarrow$ 5. Validar errores $\rightarrow$ 6. Resolver productos desconocidos (asociar al diccionario) $\rightarrow$ 7. Guardar plantilla $\rightarrow$ 8. Confirmar importación.

---

## 8. Compras, Recepción y Gestión de Costos

### 8.1 Compras & Recepción

- Orden de Compra: Pertenece a 1 proveedor; ciclo `BORRADOR` $\rightarrow$ `EMITIDA` $\rightarrow$ `PARCIAL` $\rightarrow$ `COMPLETADA`.
- Recepción: Parcial permitida $\rightarrow$ Saldo remanente queda en **`Pendiente de Recepción / Backorder`**.

### 8.2 Facturas de Proveedor & Tolerancias

- **Costo Neto Real:** Precio Factura minus descuentos/bonificaciones plus recargos (excluye IVA).
- **Factura > Recepción (Regla C):** Factura pasa a estado **`OBSERVADA`** (bloqueada, no genera deuda exigible) hasta resolución del Administrador.
- **Factura < Recepción (Regla D):** Se factura la cantidad declarada; el remanente recibido queda como **`Pendiente de Facturación`**.
- **Variación > Tolerancia Configurable (ej. 5%):** Factura retenida en **`OBSERVADA`** requiriendo autorización manual del Administrador.
- **Ajuste Retroactivo de Costos:** Se calcula la diferencia unitaria definitiva y se distribuye:
  - Units in Stock $\times \Delta$ Cost Unit $\rightarrow$ Revalorización de Inventario.
  - Units Sold $\times \Delta$ Cost Unit $\rightarrow$ Ajuste de Costo de Ventas (COGS) e Histórico de Rentabilidad.

---

## 9. Precios y Bandeja de Revisión

$$\text{Precio Neto Sugerido} = \text{Costo Neto Actual} \times (1 + \text{Markup Configurado})$$

- **Jerarquía:** Markup Producto $\rightarrow$ Markup Categoría $\rightarrow$ Markup General.
- **Regla de Oro:** **El sistema NUNCA modifica automáticamente el precio de venta al cliente.** Pasa a la **Bandeja de Revisión de Precios** para decisión del Administrador (Aprobar, Modificar, Mantener, Posponer).

---

## 10. Ventas, Facturación ARCA & Devoluciones

### 10.1 Ventas

- Matriz Operativa:
  - Contado + Facturado: ✅ Permitido.
  - Contado + Sin Factura: ✅ Permitido (descuenta stock, registra ingreso en caja).
  - Crédito + Facturado: ✅ Permitido.
  - Crédito + Sin Factura: ❌ **PROHIBIDO** (Toda venta a crédito requiere comprobante fiscal).
- **Transacción Atómica Backend:** `Venta` + `Descuento Stock` + `Cobro/CtaCte` + `Integración ARCA`.

### 10.2 Contingencias ARCA

- **Escenario A (Fallo Pre-CAE):** Venta en estado `PENDIENTE DE FACTURACIÓN`.
- **Escenario B (Conexión perdida post-CAE):** Consulta obligatoria de estado vía Web Service ARCA antes de reintento para evitar duplicación fiscal.

### 10.3 Devoluciones & Control de Calidad

- Flujo: Solicitud $\rightarrow$ Control de Calidad:
  - **Apto:** Reingresa a Stock Disponible + Nota de Crédito.
  - **No Apto:** Pasa a **`Stock Retenido / Cuarentena`** (no sale a la venta) para resolución administrativa (Merma / Devolución a Proveedor).

---

## 11. Cuentas Corrientes, Cobranzas & Cheques

- **Cuenta Corriente Ledger:** Construida mediante movimientos inmutables (`Facturas (+)`, `Pagos (-)`, `Notas de Crédito (-)`).
- **Aplicación de Pagos:** Dirigida (a facturas específicas), Múltiple o Global por Antigüedad.
- **Recibo Obligatorio:** Todo cobro genera un recibo imprimible (1 Pago $\rightarrow$ N Facturas canceladas).
- **Cheques (Ciclo de Vida):** `RECIBIDO` $\rightarrow$ `EN CARTERA` $\rightarrow$ (`DEPOSITADO` / `ENDOSADO` / `RECHAZADO`).
  - **Cheque Rechazado:** Transacción atómica que revierte la aplicación del pago, reactiva la factura como `PENDIENTE` y reinstaura la deuda en Cta Cte.

---

## 12. Tesorería & Caja

- Desglose Formal en Dashboard/Caja: `EFECTIVO`, `BANCOS / TRANSFERENCIAS` y `CHEQUES EN CARTERA`.
- Arqueo: Comparación de `Saldo Esperado` vs `Saldo Contado Físico` $\rightarrow$ Log inmutable de `Diferencia de Arqueo`.

---

## 13. Principios de Negocio Invariables

1. **Nunca stock negativo.**
2. **El precio de venta no cambia automáticamente.**
3. **La factura del proveedor define el costo real.**
4. **Diferencias de costos > tolerancia requieren autorización.**
5. **Ventas a crédito requieren obligatoriamente factura fiscal.**
6. **Todo movimiento de stock debe ser registrado en el ledger.**
7. **Los pagos deben ser trazables hasta su recibo y facturas asociadas.**
8. **Los cheques tienen ciclo de vida rastreable.**
9. **Devoluciones no aptas no vuelven al stock disponible (van a Cuarentena).**
10. **ARCA no define por sí solo el estado de la venta interna.**

---

## 14. Fuera de Alcance del MVP

- Aplicación móvil o soporte tablet nativo.
- Operación offline / almacenamiento local.
- Múltiples sucursales / depósitos.
- Trazabilidad de lotes y fechas de vencimiento.
- Lectores de código de barras / Impresoras de tickets.
- Integración directa con Mercado Pago o bancos.
- Automatizaciones de WhatsApp/Email de envío directo (sólo links directos).
- Portales externos para clientes o proveedores.

---

## 15. Matriz de Complejidad

| Complejidad  | Funcionalidades / Módulos                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🟢 **Baja**  | Usuarios, Permisos, Categorías, Productos CRUD, Clientes CRUD, Proveedores CRUD, Consultas de Stock/Precios.                                                                                            |
| 🟡 **Media** | Stock Ledger, Compras, Recepciones parciales, Ventas, Tesorería/Caja, Cuentas Corrientes, Importador de Proveedores, Reportes estándar.                                                                 |
| 🔴 **Alta**  | Integración ARCA & Contingencias, Algoritmo de Ajuste Retroactivo de Costos, Conciliación Recepción vs Factura, Reversión Transaccional de Cheques Rechazados, Motor Transaccional de Ventas/Cobranzas. |

<Wireframe: Carga Masiva de Productos y Stock Inicial>
**Módulo:** Productos  
**Ruta:** `/products/bulk-load`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 8 — Issue #257

## Descripción

Asistente (Wizard) en 3 pasos para dar de alta de forma masiva el catálogo completo de productos con sus precios, unidades, factores de conversión, tratamiento impositivo e inventario inicial base en una única operación atómica, transaccional e idempotente.

## Estructura de la Plantilla

La plantilla se descarga en formato XLSX (con hoja auxiliar `Referencia` de categorías y unidades existentes) o CSV con 12 columnas:

- `name*`: Nombre comercial/genérico del producto (obligatorio, único).
- `category*`: Nombre de la categoría (obligatorio, debe existir previamente en el sistema).
- `baseUnit*`: Símbolo o nombre de la unidad mínima indivisible de stock (obligatorio, debe existir previamente).
- `costNet*`: Costo de reposición neto (obligatorio, número positivo hasta 4 decimales).
- `activePriceNet*`: Precio de lista neto vigente (obligatorio, número positivo hasta 2 decimales).
- `description`: Descripción técnica o comercial ampliada (opcional).
- `minStock`: Umbral de alerta de reposición de inventario (opcional, por defecto 0).
- `initialStock`: Existencia inicial de apertura (opcional, si es > 0 crea el registro de stock y movimiento `AJUSTE_ENTRADA`).
- `markupPercentage`: Margen sobre costo de referencia (opcional).
- `taxTreatment`: Tratamiento impositivo fiscal (`GRAVADO`, `EXENTO`, `NO_GRAVADO`; opcional, por defecto `GRAVADO`).
- `ivaPercentage`: Alícuota de IVA (`0`, `2.5`, `5`, `10.5`, `21`, `27`; obligatorio si es `GRAVADO`, por defecto 21).
- `conversions`: Unidades de presentación y factores de conversión (opcional, sintaxis `Unidad:Factor` separadas por `;`, ej. `Caja:10; Blister:5`).

### Semántica de Validación e Integridad

- **Filas Válidas (`VALID`)**: Filas con todos los campos obligatorios correctos, categorías y unidades resueltas, y reglas matemáticas/fiscales consistentes.
- **Filas Inválidas (`INVALID`)**: Filas con errores de validación (precios o costos negativos, nombres duplicados en archivo o existentes en base de datos, unidades inexistentes, etc.).
- **Política Todo o Nada**: Transaccionalidad estricta. Si existe al menos 1 fila inválida, todo el lote queda bloqueado impidiendo la confirmación hasta corregir el archivo fuente.
- **Idempotencia Anti-duplicados**: Hash SHA-256 sobre contenido canónico ordenado (`contentChecksum`). Se rechaza con conflicto HTTP 409 (`BULK_LOAD_ALREADY_CONFIRMED`) cualquier intento de reimportar el mismo lote.
- **Anti-tamper**: Hash SHA-256 del archivo subido verificado contra el preview aprobado (`previewFileChecksum`).

## Estados del Wizard

### Estado 1: Paso 1 - Descarga de Plantilla y Subida

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Catálogo de Productos / Carga Masiva                          │
│              │                                                               │
│ 📊 Dashboard │  [████████░░░░░░░░░░░░░] Paso 1 de 3: Cargar Archivo          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Descarga la plantilla oficial con referencias:               │
│ 🚚 Compras   │  [ 📥 Plantilla Excel (.xlsx) ]   [ 📥 Plantilla CSV (.csv) ]  │
│ 💼 Ventas    │                                                               │
│ 👥 Clientes  │      ┌─────────────────────────────────────────────────┐      │
│ 💰 CtaCte    │      │                                                 │      │
│ 🏦 Tesorería │      │             📄 Arrastra tu archivo aquí         │      │
│ 📄 Reportes  │      │                     o                           │      │
│ ⚙️ Config    │      │               [ Explorar Archivos ]             │      │
│              │      │                                                 │      │
│              │      │          (Formatos: .xlsx, .csv — Máx 2 MiB)    │      │
│              │      └─────────────────────────────────────────────────┘      │
│              │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Paso 2 - Previsualización y Diagnóstico

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Catálogo de Productos / Carga Masiva                          │
│              │                                                               │
│ 📊 Dashboard │  [████████████████░░░░░] Paso 2 de 3: Validación              │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  ┌────────────┬──────────────┬──────────────┬───────────────┐ │
│ 🚚 Compras   │  │ Total: 150 │ Válidos: 150 │ Errores: 0   │ Stock Ini: 500│ │
│ 💼 Ventas    │  └────────────┴──────────────┴──────────────┴───────────────┘ │
│ 👥 Clientes  │  Filtros: [ Ver Todos ] [ Sólo Válidos ] [ Sólo Errores ]     │
│ 💰 CtaCte    │ ┌────┬──────────────────────┬─────────────┬──────────┬────────┐ │
│ 🏦 Tesorería │ │Fila│ Producto             │ Categoría   │ Costo    │ Estado │ │
│ 📄 Reportes  │ ├────┼──────────────────────┼─────────────┼──────────┼────────┤ │
│ ⚙️ Config    │ │ #2 │ Amoxicilina 500mg    │ Farmacia    │ $100.50  │ 🟢 VÁL │ │
│              │ │ #3 │ Ibuprofeno 600mg     │ Farmacia    │ $85.00   │ 🟢 VÁL │ │
│              │ └────┴──────────────────────┴─────────────┴──────────┴────────┘ │
│              │                                                               │
│              │                [ ↩ Subir Otro Archivo ] [ Confirmar y Crear >]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 3: Paso 3 - Confirmación Exitosa

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Catálogo de Productos / Carga Masiva                          │
│              │                                                               │
│ 📊 Dashboard │  [███████████████████████] Paso 3 de 3: Confirmación          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │      ┌─────────────────────────────────────────────────┐      │
│ 🚚 Compras   │      │    🎉 ¡Carga Masiva de Productos Completada!    │      │
│ 💼 Ventas    │      │                                                 │      │
│ 👥 Clientes  │      │  ID Lote: 550e8400-e29b-41d4-a716-446655440000   │      │
│ 💰 CtaCte    │      │  Productos Creados: 150 productos               │      │
│ 🏦 Tesorería │      │  Movimientos Stock Inicial: 120 (AJUSTE_ENTRADA)│      │
│ 📄 Reportes  │      │  Total Unidades Ingresadas: 500.00              │      │
│ ⚙️ Config    │      │  Fecha y Hora: 02/10/2026 16:00                 │      │
│              │      └─────────────────────────────────────────────────┘      │
│              │                                                               │
│              │          [ Realizar Nueva Carga ] [ Ir al Catálogo > ]        │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

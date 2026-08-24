<Wireframe: Carga Masiva de Stock>
**Módulo:** Stock  
**Ruta:** `/stock/bulk-load`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-09

## Descripción

Asistente (Wizard) en 3 pasos para inicializar el inventario físico mediante la descarga de una plantilla pre-poblada con productos activos y su posterior carga validada de forma atómica e idempotente.

## Estructura de la Plantilla

La plantilla se descarga pre-poblada con todos los productos en estado `ACTIVE` del catálogo:

- `internalCode`: Código único identificador (autoritativo).
- `productName`: Nombre del producto (columna informativa).
- `baseUnit`: Nombre y símbolo de la unidad base (columna informativa, ej. `Comprimido (cmp)`).
- `quantityBase`: Cantidad a ingresar (columna editable, descargada vacía).

### Semántica de Filas

- **Filas Incluidas (`INCLUDED_VALID`)**: Filas con cantidad positiva válida ingresada.
- **Filas Omitidas (`SKIPPED`)**: Filas con cantidad vacía. Se omiten silenciosamente sin generar movimientos ni errores.
- **Filas Inválidas (`INCLUDED_INVALID`)**: Filas con cantidad `<= 0`, fórmulas, caracteres inválidos, exceso de escala (`> 2` decimales) o código inexistente/inactivo.
- **Política Todo o Nada**: Si existe al menos 1 fila inválida, todo el lote queda bloqueado. Se requiere al menos 1 fila incluida válida para confirmar.

## Estados del Wizard

### Estado 1: Paso 1 - Descarga de Plantilla y Subida

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Control de Stock / Carga Inicial Masiva                      │
│              │                                                               │
│ 📊 Dashboard │  [████████░░░░░░░░░░░░░] Paso 1 de 3: Cargar Archivo          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Descarga la plantilla con productos activos:                 │
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
│ MENÚ         │  Control de Stock / Carga Inicial Masiva                      │
│              │                                                               │
│ 📊 Dashboard │  [████████████████░░░░░] Paso 2 de 3: Validación              │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  ┌────────────┬──────────────┬──────────────┬───────────────┐ │
│ 🚚 Compras   │  │ Total: 350 │ A Cargar: 25 │ Omitidos: 325│ Errores: 0    │ │
│ 💼 Ventas    │  └────────────┴──────────────┴──────────────┴───────────────┘ │
│ 👥 Clientes  │  Filtros: [ Productos a Cargar ] [ Ver Todos ] [ Sólo Errores]│
│ 💰 CtaCte    │ ┌────────┬───────────┬──────────────────────┬───────┬────────┐ │
│ 🏦 Tesorería │ │ Fila   │ Código    │ Producto Resuelto    │ Cant. │ Estado │ │
│ 📄 Reportes  │ ├────────┼───────────┼──────────────────────┼───────┼────────┤ │
│ ⚙️ Config    │ │ #2     │ P0001     │ Ibuprofeno 400 mg    │ 100   │ 🟢 INCL│ │
│              │ │ #3     │ P0002     │ Amoxicilina 500 mg   │ —     │ ⚪ OMIT│ │
│              │ └────────┴───────────┴──────────────────────┴───────┴────────┘ │
│              │                                                               │
│              │                [ ↩ Cambiar Archivo ]  [ Siguiente: Confirmar >]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 3: Paso 3 - Confirmación e Idempotencia

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Control de Stock / Carga Inicial Masiva                      │
│              │                                                               │
│ 📊 Dashboard │  [███████████████████████] Paso 3 de 3: Confirmación          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │      ┌─────────────────────────────────────────────────┐      │
│ 🚚 Compras   │      │                 Resumen de Carga                │      │
│ 💼 Ventas    │      │                                                 │      │
│ 👥 Clientes  │      │  Archivo: recuento_fisico.xlsx                  │      │
│ 💰 CtaCte    │      │  Productos a Cargar: 25 producto(s)             │      │
│ 🏦 Tesorería │      │  Filas Omitidas: 325 fila(s)                    │      │
│ 📄 Reportes  │      │  Tipo de Movimiento: AJUSTE_ENTRADA             │      │
│ ⚙️ Config    │      │                                                 │      │
│              │      │  ⚠️ Se aplicará de forma atómica e irreversible.│      │
│              │      └─────────────────────────────────────────────────┘      │
│              │                                                               │
│              │          [ < Volver a Validación ] [ 🔒 Confirmar y Aplicar ] │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Seguridad e Integridad

- **Transacción Atómica**: Se aplica en una única transacción PostgreSQL con locks ordenados por `productId ASC` para evitar deadlocks.
- **Idempotencia con Checksum**: El checksum canónico SHA-256 se calcula exclusivamente sobre las filas `INCLUDED_VALID` ordenadas alfabéticamente. Subir el mismo lote (o en formato alternativo) es rechazado como duplicado (`409 Conflict`).

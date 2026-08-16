<Wireframe: Carga Masiva de Stock>
**Módulo:** Stock  
**Ruta:** `/stock/bulk-load`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-08  

## Descripción
Asistente (Wizard) para cargar o actualizar saldos iniciales de stock mediante un archivo Excel/CSV.

## Estados

### Estado 1: Paso 1 - Subida

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Carga Masiva                                         │
│              │                                                               │
│ 📊 Dashboard │  [████████░░░░░░░░░░░░░] Paso 1 de 3: Cargar Archivo          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Descarga la plantilla de ejemplo: [ Plantilla.xlsx ]         │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │      ┌─────────────────────────────────────────────────┐      │
│ 👥 Clientes  │      │                                                 │      │
│ 💰 CtaCte    │      │             📄 Arrastra tu archivo aquí         │      │
│ 🏦 Tesorería │      │                     o                           │      │
│ 📄 Reportes  │      │               [ Explorar Archivos ]             │      │
│ ⚙️ Config    │      │                                                 │      │
│              │      │          (Formato soportado: .csv, .xlsx)       │      │
│              │      └─────────────────────────────────────────────────┘      │
│              │                                                               │
│              │                                              [ Siguiente > ]  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Paso 2 - Previsualización

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Carga Masiva                                         │
│              │                                                               │
│ 📊 Dashboard │  [████████████████░░░░░] Paso 2 de 3: Validación              │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  [ ⚠ 1 Fila tiene errores y será omitida ]                    │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │ ┌────────────┬───────┬──────────────────────┬───────────────┐ │
│ 👥 Clientes  │ │ Cód Excel  │ Cant. │ Producto Encontrado  │ Estado        │ │
│ 💰 CtaCte    │ ├────────────┼───────┼──────────────────────┼───────────────┤ │
│ 🏦 Tesorería │ │ JER-05     │  450  │ Jeringa 5ml x100     │ 🟢 VÁLIDO     │ │
│ 📄 Reportes  │ │ GAS-10     │ 1200  │ Gasa Estéril 10x10   │ 🟢 VÁLIDO     │ │
│ ⚙️ Config    │ │ INVALID-01 │   50  │ ---                  │ 🔴 CÓD NO ENC │ │
│              │ └────────────┴───────┴──────────────────────┴───────────────┘ │
│              │                                                               │
│              │                                [ < Volver ]  [ Siguiente > ]  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 3: Paso 3 - Confirmación

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Carga Masiva                                         │
│              │                                                               │
│ 📊 Dashboard │  [███████████████████████] Paso 3 de 3: Confirmación          │
│ 📦 Productos │                                                               │
│ 📋 Stock     │      ┌─────────────────────────────────────────────────┐      │
│ 🚚 Compras   │      │                 Resumen de Carga                │      │
│ 💼 Ventas    │      │                                                 │      │
│ 👥 Clientes  │      │  🟢 2 Productos se actualizarán.                │      │
│ 💰 CtaCte    │      │  🔴 1 Fila será ignorada.                       │      │
│ 🏦 Tesorería │      │                                                 │      │
│ 📄 Reportes  │      │  ¿Deseas aplicar estos movimientos como un      │      │
│ ⚙️ Config    │      │  ajuste inicial de inventario?                  │      │
│              │      └─────────────────────────────────────────────────┘      │
│              │                                                               │
│              │                                [ < Volver ] [ Confirmar Carga]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- La carga masiva genera múltiples movimientos de "Ajuste de Stock Inicial" en el ledger.
- Es crucial mostrar claramente qué productos fueron encontrados (match por código interno) y cuáles fallaron antes de procesar.

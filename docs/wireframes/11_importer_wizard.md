</Agent System Instructions>
<Wireframe: Importador Masivo>
**Módulo:** Importador  
**Ruta:** `/importer`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-11  

## Descripción
Asistente (wizard) de 4 pasos para la importación masiva de listas de precios o actualizaciones de catálogo desde archivos Excel o CSV.

## Estados

### Estado 1: Paso 1 - Subida

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Importador                                          │
│              │                                                               │
│ 📊 Dashboard │  [ (1) Subir ] ──── [ 2 Mapeo ] ──── [ 3 Revisión ] ──── [ 4 Confirmar ] │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  PROVEEDOR: [v 3M Argentina                               ]   │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │  ┌────────────────────────────────────────────────────────┐   │
│ 👥 Clientes  │  │                                                        │   │
│ 💰 CtaCte    │  │    [⬆️] Arrastre el archivo Excel/CSV aquí             │   │
│ 🏦 Tesorería │  │          o haga clic para seleccionar                  │   │
│ 📄 Reportes  │  │                                                        │   │
│ ⚙️ Config    │  └────────────────────────────────────────────────────────┘   │
│              │                                                               │
│              │  ℹ Plantilla guardada detectada: "Lista de Precios 3M"        │
│              │                                                               │
│              │                                     [ Continuar al Mapeo ]    │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Paso 2 - Mapeo

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  [ 1 Subir ] ──── [ (2) Mapeo ] ──── [ 3 Revisión ] ──── [ 4 Confirmar ] │
│              │                                                               │
│ 📊 Dashboard │  MAPEO DE COLUMNAS                                            │
│ 📦 Productos │  ┌────────────────────────────────────────────────────────┐   │
│ 📋 Stock     │  │ Columna Archivo │ Campo del Sistema  │ Ejemplo Dato    │   │
│ 🚚 Compras   │  ├─────────────────┼────────────────────┼─────────────────┤   │
│ 💼 Ventas    │  │ COD_ARTICULO    │ [v Código Prov   ] │ 3M-1522         │   │
│ 👥 Clientes  │  │ DESC_ARTICULO   │ [v Desc. Prov    ] │ Cinta Micro...  │   │
│ 💰 CtaCte    │  │ PRECIO_LISTA    │ [v Costo         ] │ 15000.00        │   │
│ 🏦 Tesorería │  │ IGNORAR_COL     │ [v (Ignorar)     ] │ Oferta          │   │
│ 📄 Reportes  │  └────────────────────────────────────────────────────────┘   │
│ ⚙️ Config    │  [ ] Guardar esta configuración como plantilla                │
│              │                                                               │
│              │  [ Volver ]                         [ Previsualizar Datos ]   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 3: Paso 3 - Revisión (Preview)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  [ 1 Subir ] ──── [ 2 Mapeo ] ──── [ (3) Revisión ] ──── [ 4 Confirmar ] │
│              │                                                               │
│ 📊 Dashboard │  PREVISUALIZACIÓN DE IMPORTACIÓN                              │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  ✓ [ Listos (150) ] ──────────────────────────────── (click)  │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │  ⚠ [ SKUs Desconocidos (2) ] ─────────────────────── (open)   │
│ 👥 Clientes  │    │ Línea 4: "3M-999" (Curitas). Resolver:                   │
│ 💰 CtaCte    │    │ Prod: [ Buscar prod... ] Fact: [  ] Costo: [$ 500  ] [OK]│
│ 🏦 Tesorería │    │ Línea 8: "3M-888" (Gasa). Resolver:                      │
│ 📄 Reportes  │    │ Prod: [ Buscar prod... ] Fact: [  ] Costo: [$ 150  ] [OK]│
│ ⚙️ Config    │                                                               │
│              │  ✗ [ Errores (1) ] ───────────────────────────────── (click)  │
│              │                                                               │
│              │  [ Volver ]                                   [ Siguiente ]   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 4: Paso 4 - Confirmación

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  [ 1 Subir ] ──── [ 2 Mapeo ] ──── [ 3 Revisión ] ──── [ (4) Confirmar ] │
│              │                                                               │
│ 📊 Dashboard │  RESUMEN DE IMPORTACIÓN                                       │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Archivo:      lista_precios_marzo.xlsx                       │
│ 🚚 Compras   │  Proveedor:    3M Argentina                                   │
│ 💼 Ventas    │  Registros:    152 a procesar                                 │
│ 👥 Clientes  │  Acciones:     150 actualizaciones de precio                  │
│ 💰 CtaCte    │                2 nuevas asociaciones de catálogo              │
│ 🏦 Tesorería │                                                               │
│ 📄 Reportes  │  ¿Desea aplicar estos cambios?                                │
│ ⚙️ Config    │                                                               │
│              │  [ Volver ]                        [ Confirmar Importación ]  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Si hay errores bloqueantes en el Paso 3, el botón de Siguiente debe estar deshabilitado.
- SKUs desconocidos requieren asociar a un producto interno, o marcarlos para saltar.

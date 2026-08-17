</Agent System Instructions>
<Wireframe: Catálogo de Proveedor>
**Módulo:** Compras  
**Ruta:** `/suppliers/:id/catalog`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-10

## Descripción

Gestiona la asociación entre los códigos/SKUs del proveedor y los productos internos del sistema, incluyendo equivalencias de unidades (Factor de Conversión) y costos de referencia.

## Estados

### Estado 1: Vista del Catálogo

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Proveedores > 3M Argentina > Catálogo               │
│              │                                                               │
│ 📊 Dashboard │  CATÁLOGO DEL PROVEEDOR: 3M Argentina (CUIT: 30-123456-9)     │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  ┌─────────────────────────────────────────────────────────┐  │
│ 🚚 Compras   │  │ Cód. Prov │ Desc. Prov. │ Producto Interno │ U. Compra  │  │
│ 💼 Ventas    │  ├───────────┼─────────────┼──────────────────┼────────────┤  │
│ 👥 Clientes  │  │ 3M-1522   │ Cinta Micro │ Cinta Micropore  │ Caja x 12  │  │
│ 💰 CtaCte    │  │ ↳ F. Conv: 12  | Costo: $ 15,000 | [x] Hab | [Ed][Elim] │  │
│ 🏦 Tesorería │  ├───────────┼─────────────┼──────────────────┼────────────┤  │
│ 📄 Reportes  │  │ 3M-1860   │ Barbi N95   │ Mascarilla N95   │ Caja x 20  │  │
│ ⚙️ Config    │  │ ↳ F. Conv: 20  | Costo: $ 35,000 | [x] Hab | [Ed][Elim] │  │
│              │  └─────────────────────────────────────────────────────────┘  │
│              │                                                               │
│              │  NUEVA ASOCIACIÓN                                             │
│              │  Producto: [ Buscar producto interno...             ]         │
│              │  Cód. Prov: [_________] Desc. Prov: [________________]        │
│              │  Unidad C.: [_________] Factor Conv: [____] Costo: [_______]  │
│              │  [ x ] Proveedor Habitual           [ Agregar Asociación ]    │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- El campo "Producto Interno" es un buscador autocompletable.
- "Factor Conversión": cuántas unidades base (Ej. Unidad) tiene la Unidad de Compra (Ej. Caja x 12).
- "Costo Habitual": sirve de referencia.
- "Es Habitual" indica si este es el proveedor preferido para el producto interno (se marca automáticamente si es el primero).

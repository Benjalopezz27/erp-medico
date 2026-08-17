<Wireframe: Panel de Stock>
**Módulo:** Stock  
**Ruta:** `/stock`  
**Rol(es):** ADMINISTRADOR | VENDEDOR (solo lectura)  
**Sprint:** Sprint 2 — US-05

## Descripción

Panel central para visualizar el estado del inventario y gestionar niveles de alerta.

## Estados

### Estado 1: Vista General

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Panel de Control                                     │
│              │                                                               │
│ 📊 Dashboard │  [ ⚠ 3 Productos por debajo del stock mínimo ]                │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Filtros:                             Acciones Admin:         │
│ 🚚 Compras   │  [Categoría v]  [Estado v] [x] Solo Bajo Mínimo [ Carga Masiva ] │
│ 💼 Ventas    │                                                               │
│ 👥 Clientes  │ ┌─────────┬──────────────────────┬───────┬─────┬──────┬─────────┬─────────┐ │
│ 💰 CtaCte    │ │ Código  │ Producto             │ Categ │Stock│ Mín. │ Estado  │ Acciones│ │
│ 🏦 Tesorería │ ├─────────┼──────────────────────┼───────┼─────┼──────┼─────────┼─────────┤ │
│ 📄 Reportes  │ │ CAT-20G │ Catéter IV 20G       │ Desca │   0 │   50 │ 🔴 CRÍT │ [Ajuste]│ │
│ ⚙️ Config    │ │ SUE-F1  │ Suero Fisiol. 1L     │ Soluc │  45 │  100 │ 🟡 BAJO │ [Ajuste]│ │
│              │ │ GAS-10  │ Gasa Estéril 10x10   │ Insum │  95 │  100 │ 🟡 BAJO │ [Ajuste]│ │
│              │ │ JER-05  │ Jeringa 5ml x100     │ Desca │ 450 │   50 │ 🟢 NORM │ [Ajuste]│ │
│              │ │ GUA-M   │ Guantes Látex M      │ Insum │ 300 │  100 │ 🟢 NORM │ [Ajuste]│ │
│              │ └─────────┴──────────────────────┴───────┴─────┴──────┴─────────┴─────────┘ │
│              │                                                               │
│              │ Mostrando 1-5 de 142 productos               [<] [1] [2] [3] [>]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- El botón `[ Ajuste ]` (Ajuste Manual) y `[ Carga Masiva ]` solo son visibles para el rol ADMINISTRADOR.
- El toggle `[x] Solo Bajo Mínimo` filtra la tabla para mostrar solo productos en estado BAJO o CRÍTICO.
- Colores de estado:
  - 🟢 NORMAL: Stock > Mínimo
  - 🟡 BAJO: 0 < Stock <= Mínimo
  - 🔴 CRÍTICO: Stock = 0
- El stock se muestra siempre en Unidad Base. No incluye mercadería en Cuarentena.

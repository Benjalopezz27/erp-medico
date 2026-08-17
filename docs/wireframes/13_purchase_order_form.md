</Agent System Instructions>
<Wireframe: Orden de Compra - Nueva>
**Módulo:** Compras  
**Ruta:** `/purchases/orders/new`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-13

## Descripción

Formulario para la creación y emisión de una nueva Orden de Compra.

## Estados

### Estado 1: Formulario de Nueva OC

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Compras > Órdenes de Compra > Nueva                 │
│              │                                                               │
│ 📊 Dashboard │  NUEVA ORDEN DE COMPRA                                        │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Proveedor: [v 3M Argentina                       ]           │
│ 🚚 Compras   │  F. Esperada Entrega: [ 20/10/2024 ]                          │
│ 💼 Ventas    │                                                               │
│ 👥 Clientes  │  DETALLE DE ÍTEMS                                             │
│ 💰 CtaCte    │  ┌─────────────────────────────────────────────────────────┐  │
│ 🏦 Tesorería │  │ Producto            │ U. Compra │ Cantidad │ Costo Esp. │  │
│ 📄 Reportes  │  ├─────────────────────┼───────────┼──────────┼────────────┤  │
│ ⚙️ Config    │  │ [v Cinta Micropore] │ Caja x 12 │ [ 10   ] │ [$ 15,000] │  │
│              │  │ [v Mascarilla N95 ] │ Caja x 20 │ [ 50   ] │ [$ 35,000] │  │
│              │  │ [ Buscar producto...]                                   │  │
│              │  └─────────────────────────────────────────────────────────┘  │
│              │                                                               │
│              │  MONTO TOTAL ESTIMADO: $ 1,900,000.00                         │
│              │                                                               │
│              │                  [ Guardar Borrador ]  [ Emitir OC ]          │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Al seleccionar proveedor, el ProductSearchInput solo debería mostrar, o priorizar, los productos que tienen catálogo con ese proveedor.
- Unidad de Compra se trae del catálogo del proveedor, si existe.
- El Monto Total se recalcula en base a Cantidad * Costo Esperado de cada ítem.

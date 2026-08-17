</Agent System Instructions>
<Wireframe: Órdenes de Compra - Listado>
**Módulo:** Compras  
**Ruta:** `/purchases/orders`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-12

## Descripción

Listado y estado de las Órdenes de Compra (OC) emitidas a proveedores.

## Estados

### Estado 1: Listado de Órdenes

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Compras > Órdenes de Compra                         │
│              │                                                               │
│ 📊 Dashboard │  ÓRDENES DE COMPRA                           [ + Nueva OC ]   │
│ 📦 Productos │                                                               │
│ 📋 Stock     │  Proveedor: [v Todos         ] Estado: [v Todos          ]    │
│ 🚚 Compras   │  Fechas: [ Inicio... ] al [ Fin... ]         [ Filtrar ]      │
│ 💼 Ventas    │                                                               │
│ 👥 Clientes  │  ┌─────────────────────────────────────────────────────────┐  │
│ 💰 CtaCte    │  │ N° OC    │ Proveedor │ Fecha Em. │ Estado      │ Monto  │  │
│ 🏦 Tesorería │  ├──────────┼───────────┼───────────┼─────────────┼────────┤  │
│ 📄 Reportes  │  │ OC-00142 │ Propato   │ 10/10/24  │ [ BORRADOR] │ $120k  │  │
│ ⚙️ Config    │  │ ↳ [Ver] [Emitir] [Cancelar]                             │  │
│              │  ├──────────┼───────────┼───────────┼─────────────┼────────┤  │
│              │  │ OC-00141 │ 3M Arg.   │ 09/10/24  │ [ EMITIDA ] │ $450k  │  │
│              │  │ ↳ [Ver] [Recibir] [Cancelar]                            │  │
│              │  ├──────────┼───────────┼───────────┼─────────────┼────────┤  │
│              │  │ OC-00140 │ Johnson   │ 05/10/24  │ [ PARCIAL ] │ $300k  │  │
│              │  │ ↳ [Ver] [Recibir] [Cancelar]                            │  │
│              │  ├──────────┼───────────┼───────────┼─────────────┼────────┤  │
│              │  │ OC-00139 │ Braun     │ 01/10/24  │ [COMPLETADA]│ $980k  │  │
│              │  │ ↳ [Ver]                                                 │  │
│              │  └─────────────────────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- "Emitir" solo disponible si estado es BORRADOR.
- "Recibir" disponible si estado es EMITIDA o PARCIAL.
- "Cancelar" disponible para EMITIDA y PARCIAL (cancela el saldo pendiente).

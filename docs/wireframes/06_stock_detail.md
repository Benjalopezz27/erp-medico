<Wireframe: Detalle y Movimientos de Stock>
**Módulo:** Stock  
**Ruta:** `/stock/:productId`  
**Rol(es):** ADMINISTRADOR | VENDEDOR (solo lectura)  
**Sprint:** Sprint 2 — US-06  

## Descripción
Vista detallada del histórico de movimientos de stock (kardex/ledger) de un producto específico y su gráfico de evolución.

## Estados

### Estado 1: Vista Detalle

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Detalle / SUE-F1                                     │
│              │                                                               │
│ 📊 Dashboard │  ■ Suero Fisiológico 1L (SUE-F1)                   [ Ajuste Manual ] │
│ 📦 Productos │  ──────────────────────────────────────────────────────────────│
│ 📋 Stock     │  Stock Actual: 45 Bot.  |  Mínimo: 100 Bot.  | Estado: 🟡 BAJO │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │  [ Gráfico de Tendencia de Stock (Recharts Placeholder)       ]│
│ 👥 Clientes  │  [       / \                                                  ]│
│ 💰 CtaCte    │  [      /   \___      / \                                     ]│
│ 🏦 Tesorería │  [ ____/        \____/   \__      (Eje Y: Cantidad)           ]│
│ 📄 Reportes  │  [                            (Eje X: Tiempo)                 ]│
│ ⚙️ Config    │                                                               │
│              │  ■ HISTORIAL DE MOVIMIENTOS                                   │
│              │  [ Rango Fechas v ]  [ Tipo de Movimiento v ]                 │
│              │ ┌──────────┬──────────┬─────┬──────┬──────┬─────────┬───────┬──────┐ │
│              │ │ Fecha    │ Tipo     │Cant.│ S.Ant│ S.Pos│ Motivo  │ Ref.  │ Usuar│ │
│              │ ├──────────┼──────────┼─────┼──────┼──────┼─────────┼───────┼──────┤ │
│              │ │ 14/08/26 │ SALIDA   │ -10 │   55 │   45 │ VENTA   │ FAC-10│ jperez│ │
│              │ │ 12/08/26 │ INGRESO  │ +50 │    5 │   55 │ COMPRA  │ REM-05│ admin │ │
│              │ │ 10/08/26 │ AJUSTE   │  -2 │    7 │    5 │ ROTURA  │ AJU-99│ admin │ │
│              │ │ 05/08/26 │ SALIDA   │ -30 │   37 │    7 │ VENTA   │ FAC-08│ jperez│ │
│              │ └──────────┴──────────┴─────┴──────┴──────┴─────────┴───────┴──────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Modal de Ajuste Manual (Overlay)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────┐        │
│    │  AJUSTE MANUAL DE STOCK                                     [x]│        │
│    │  Producto: Suero Fisiológico 1L                                │        │
│    │                                                                │        │
│    │  Tipo de Ajuste *         Cantidad *                           │        │
│    │  ( • ) Ingreso            [ 5           ] Bot.                 │        │
│    │  (   ) Salida                                                  │        │
│    │                                                                │        │
│    │  Motivo *                                                      │        │
│    │  [ ROTURA / MERMA                                       v ]    │        │
│    │                                                                │        │
│    │  Observaciones                                                 │        │
│    │  [ Cajas dañadas durante el traslado interno.             ]    │        │
│    │                                                                │        │
│    │                                [ Cancelar ] [ Confirmar Ajuste ] │      │
│    └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Todo movimiento debe quedar registrado en el Ledger con su respectivo Tipo, Motivo, y Referencia.
- El saldo posterior (S.Pos) debe cuadrar siempre.
- Un ajuste de salida que baje el stock de 0 no debe ser permitido (regla de negocio).

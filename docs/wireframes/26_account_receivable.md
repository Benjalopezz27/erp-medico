<Wireframe: Cuentas por Cobrar>
**Módulo:** CtaCte  
**Ruta:** `/receivables` y `/customers/:id/account`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 3 — US-09

## Descripción

Gestión de deuda de clientes (Cuentas Corrientes) y antigüedad de saldos.

## Estados

### Estado 1: Listado Global de Deudas (`/receivables`)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Cuentas Corrientes > Saldos a Cobrar                          │
│              │                                                                │
│ 📊 Dashboard │  Filtros: [ Cliente... 🔎] [v Todos los Estados ]              │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  ┌───────────────────────────────────────────────────────────┐ │
│ 🚚 Compras   │  │ Cliente          | FC Pend. | Saldo Total | Deuda Más Ant.│ │
│ 💼 Ventas    │  ├───────────────────────────────────────────────────────────┤ │
│ 👥 Clientes  │  │ Farmacia del Sud | 3        | ⚠ $ 450.000 | 45 días       │ │
│ 💰 CtaCte    │  │ Estado: [MOROSO]                      [ Ver Cta Cte ]     │ │
│ 🏦 Tesorería │  ├───────────────────────────────────────────────────────────┤ │
│ 📄 Reportes  │  │ Hospital Norte   | 1        | $ 150.000   | 2 días        │ │
│ ⚙️ Config    │  │ Estado: [AL DÍA]                      [ Ver Cta Cte ]     │ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Detalle de Cliente / Aging Table (`/customers/1/account`)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Clientes > Farmacia del Sud > Cuenta Corriente                │
│              │                                                                │
│ 📊 Dashboard │  Saldo Total: $ 450.000                                        │
│ 👥 Clientes  │                                                                │
│              │  Antigüedad de Deuda:                                          │
│              │  ┌────────────┬────────────┬─────────────┐                     │
│              │  │ 0-30 días  │ 31-60 días │ +60 días ⚠  │                     │
│              │  ├────────────┼────────────┼─────────────┤                     │
│              │  │ $ 100.000  │ $ 200.000  │ $ 150.000   │                     │
│              │  └────────────┴────────────┴─────────────┘                     │
│              │                                                                │
│              │  [ REGISTRAR COBRO ]                                           │
│              │                                                                │
│              │  Detalle de Movimientos:                                       │
│              │  ... (lista de FC, NC, ND, Recibos) ...                        │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Color rojo para saldos con antigüedad > 30 días o si el estado es moroso.
- El botón "Registrar Cobro" lleva al formulario de cobro para este cliente.

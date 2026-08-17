<Wireframe: Dashboard de Tesorería>
**Módulo:** Tesorería  
**Ruta:** `/treasury`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-13

## Descripción

Resumen general de saldos de la empresa y movimientos históricos.

## Estados

### Estado 1: Vista General

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                        [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Tesorería > Visión Global                                     │
│              │                                                                │
│ 📊 Dashboard │  Saldos Consolidados:                                          │
│ 📦 Productos │  ┌────────────────┬─────────────────┬──────────────────┐       │
│ 📋 Stock     │  │ EFECTIVO       │ BCOS / TRANSF.  │ CHEQUES EN CART. │       │
│ 🚚 Compras   │  │ $ 1.250.000    │ $ 15.430.000    │ $ 4.500.000      │       │
│ 💼 Ventas    │  └────────────────┴─────────────────┴──────────────────┘       │
│ 👥 Clientes  │                                                                │
│ 💰 CtaCte    │  [ + MOVIMIENTO MANUAL ]                                       │
│ 🏦 Tesorería │                                                                │
│ 📄 Reportes  │  Historial de Movimientos:                                     │
│ ⚙️ Config    │  ┌───────────────────────────────────────────────────────────┐ │
│              │  │ Fecha | Cuenta | Tipo    | Monto     | Referencia         │ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ 14/08 | Efect. | Ingreso | $ 50.000  | Recibo R-00050     │ │
│              │  │ 14/08 | Banco  | Ingreso | $ 150.000 | Recibo R-00049     │ │
│              │  │ 13/08 | Efect. | Egreso  | $ 10.000  | Gasto: Librería    │ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- "Movimiento Manual" permite registrar ajustes, retiros, o depósitos. Solo disponible para rol ADMINISTRADOR.

<Wireframe: Listado de Cheques>
**Módulo:** Tesorería  
**Ruta:** `/treasury/checks`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-12  

## Descripción
Gestión de cheques de terceros, seguimiento de estados y alertas por vencimientos cercanos.

## Estados

### Estado 1: Vista General de Cheques

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                        [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Tesorería > Gestión de Cheques                                │
│              │                                                                │
│ 📊 Dashboard │  [ ⚠ 1 cheque vence en los próximos 7 días! ]                  │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  Filtros: [v Estado ] [ Vencimiento... 📅]                     │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  ┌───────────────────────────────────────────────────────────┐ │
│ 👥 Clientes  │  │ Banco | N° Cheque | Cliente       | Monto     | Vto       │ │
│ 💰 CtaCte    │  ├───────────────────────────────────────────────────────────┤ │
│ 🏦 Tesorería │  │ Gali..| 12345678  | Farmacia del..| $ 200.000 | 15/09/2026│ │
│ 📄 Reportes  │  │ Estado: [RECIBIDO]         [Acciones v] (Mover a Cartera) │ │
│ ⚙️ Config    │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ Naci..| 87654321  | Hospital Norte| $ 50.000  | 16/08/2026│ │
│              │  │ Estado: [EN_CARTERA] ⚠     [Acciones v] (Depositar/Endosa)│ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ Sánt..| 11223344  | Clínica Oeste | $ 10.000  | 01/08/2026│ │
│              │  │ Estado: [RECHAZADO] ✗      [Acciones v] (Ver Detalle)     │ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- El estado `RECIBIDO` es recién ingresado. Pasa a `EN_CARTERA` cuando la caja se consolida.
- Desde `EN_CARTERA` se pueden `Depositar`, `Endosar` (a proveedor) o marcar como `Rechazado`.
- Al rechazar, el sistema debe reversar atómicamente el cobro y reabrir la factura original.

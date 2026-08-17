<Wireframe: Dashboard>
**Módulo:** Dashboard  
**Ruta:** `/`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 1 — US-03

## Descripción

Pantalla principal tras el login. Muestra KPIs clave y un resumen de las últimas ventas.

## Estados

### Estado 1: Dashboard - Vista Principal (ADMINISTRADOR)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Juan Admin] [ADMIN] [Cerrar]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Dashboard                                                    │
│              │                                                               │
│ 📊 Dashboard │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ 📦 Productos │  │ Ventas Hoy   │ │ Ventas Mes   │ │ Bajo Mínimo  │           │
│ 📋 Stock     │  │ $ 450.000    │ │ $ 8.5M       │ │ ⚠ 12 prods   │           │
│ 🚚 Compras   │  └──────────────┘ └──────────────┘ └──────────────┘           │
│ 💼 Ventas    │  ┌──────────────┐ ┌──────────────┐                            │
│ 👥 Clientes  │  │ Fact. Observ.│ │ Cheques 7d   │                            │
│ 🏭 Proveedor.│  │ ✗ 3 facturas │ │ ℹ 5 cheques  │                            │
│ 💰 CtaCte    │  └──────────────┘ └──────────────┘                            │
│ 🏦 Tesorería │                                                               │
│ 📄 Reportes  │  Últimas Ventas                                               │
│ ⚙️ Config    │  ┌────────┬────────────────┬────────────┬──────────────────┐  │
│              │  │ N° Vta │ Cliente        │ Monto      │ Estado           │  │
│              │  ├────────┼────────────────┼────────────┼──────────────────┤  │
│              │  │ V-102  │ Clinica Centro │ $ 45.000   │ ✓ CONFIRMADO     │  │
│              │  │ V-101  │ Hosp. Italiano │ $ 120.000  │ ✓ CONFIRMADO     │  │
│              │  │ V-100  │ Dr. Perez      │ $ 12.500   │ ✗ PEND_FACTURAC  │  │
│              │  │ V-099  │ Centro Med Sur │ $ 89.000   │ ✓ CONFIRMADO     │  │
│              │  │ V-098  │ Clinica Centro │ $ 34.200   │ ✓ CONFIRMADO     │  │
│              │  └────────┴────────────────┴────────────┴──────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- "Bajo Mínimo" redirige a `/stock?filter=alerts`.
- "Fact. Observ." redirige a `/compras?status=OBSERVADA`.
- "Cheques 7d" redirige a `/tesoreria/cheques?vencimiento=7d`.
- VENDEDOR solo ve "Ventas Hoy", "Ventas Mes" y "Últimas Ventas" (los KPIs de compras y tesorería no se renderizan).

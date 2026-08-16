<Wireframe: Listado de Ventas>
**Módulo:** Ventas  
**Ruta:** `/sales`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 2 — US-06  

## Descripción
Listado general de ventas con filtros y estado de facturación.

## Estados

### Estado 1: Lista Cargada

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Ventas > Listado                                              │
│              │                                                                │
│ 📊 Dashboard │  Filtros:                                                      │
│ 📦 Productos │  [ 01/08/2026 - 14/08/2026 📅] [ Cliente... 🔎] [v Estado ]    │
│ 📋 Stock     │                                       [ + NUEVA VENTA ]        │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  ┌───────────────────────────────────────────────────────────┐ │
│ 👥 Clientes  │  │ N° Venta | Fecha      | Cliente          | Monto Total    │ │
│ 💰 CtaCte    │  ├───────────────────────────────────────────────────────────┤ │
│ 🏦 Tesorería │  │ V-00102  | 14/08/2026 | Farmacia del Sud | $ 24.805       │ │
│ 📄 Reportes  │  │ Ítems: 3 | Medio: CtaCte| Estado: [CONFIRMADA]            │ │
│ ⚙️ Config    │  │ Factura: [EMITIDO]                         [ Ver Detalle ]│ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ V-00101  | 13/08/2026 | Hospital Norte   | $ 150.000      │ │
│              │  │ Ítems: 15| Medio: Mixto | Estado: [CONFIRMADA]            │ │
│              │  │ Factura: [PENDIENTE]                       [ Ver Detalle ]│ │
│              │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ V-00100  | 13/08/2026 | Clínica Oeste    | $ 12.000       │ │
│              │  │ Ítems: 2 | Medio: Efect | Estado: [CONFIRMADA]            │ │
│              │  │ Factura: [SIN FACTURA]                     [ Ver Detalle ]│ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- "Medio" muestra CtaCte, Efect, Transf, Cheque o Mixto.
- Estado de factura tiene insignias de colores (Verde: Emitido, Amarillo: Pendiente, Gris: Sin Factura).

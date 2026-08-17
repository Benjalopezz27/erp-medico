</Agent System Instructions>
<Wireframe: Entregas Pendientes (Backorders)>
**Módulo:** Compras  
**Ruta:** `/purchases/backorders`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-15

## Descripción

Panel de seguimiento de mercadería pedida que aún no ha sido entregada, agrupada por proveedor para facilitar los reclamos.

## Estados

### Estado 1: Vista de Backorders

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Compras > Backorders                                │
│              │                                                               │
│ 📊 Dashboard │  MERCADERÍA PENDIENTE DE RECEPCIÓN                            │
│ 📦 Productos │  Resumen: 5 órdenes con recepción pendiente                   │
│ 📋 Stock     │                                                               │
│ 🚚 Compras   │  ▼ 3M Argentina (2 órdenes pendientes)                        │
│ 💼 Ventas    │  ┌─────────────────────────────────────────────────────────┐  │
│ 👥 Clientes  │  │ N° OC    │ F. Emisión │ Producto    │ Pend. │ Antig.    │  │
│ 💰 CtaCte    │  ├──────────┼────────────┼─────────────┼───────┼───────────┤  │
│ 🏦 Tesorería │  │ OC-00110 │ 15/09/24   │ Cinta Micro │ 5 cjs │ 30d [URG] │  │
│ 📄 Reportes  │  │ OC-00141 │ 09/10/24   │ Masc. N95   │ 30 cjs│  5d       │  │
│ ⚙️ Config    │  │                                 [ Registrar Recepción ] │  │
│              │  └─────────────────────────────────────────────────────────┘  │
│              │                                                               │
│              │  ► Johnson & Johnson (1 orden pendiente)                      │
│              │                                                               │
│              │  ► B. Braun Medical (2 órdenes pendientes)                    │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- "Antig." (Días transcurridos) muestra un badge rojo [URGENTE] si > 14 días.
- "Registrar Recepción" lleva a `/purchases/orders/:id/receive` para la OC correspondiente, para facilitar la resolución rápida.
- Agrupación colapsable por proveedor.

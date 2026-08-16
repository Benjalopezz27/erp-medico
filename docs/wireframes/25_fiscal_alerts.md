<Wireframe: Alertas Fiscales>
**Módulo:** Ventas / Admin  
**Ruta:** `/admin/fiscal-alerts`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-08  

## Descripción
Monitor de comprobantes que fallaron al comunicarse con ARCA/AFIP y quedaron pendientes o fueron rechazados.

## Estados

### Estado 1: Con Alertas

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Administración > Alertas Fiscales                             │
│              │                                                                │
│ 📊 Dashboard │  [ ⚠ ATENCIÓN: Hay 2 comprobantes pendientes de facturación ]  │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  ┌───────────────────────────────────────────────────────────┐ │
│ 🚚 Compras   │  │ N° Venta | Cliente          | Fecha      | Monto          │ │
│ 💼 Ventas    │  ├───────────────────────────────────────────────────────────┤ │
│ 👥 Clientes  │  │ V-00101  | Hospital Norte   | 13/08/2026 | $ 150.000      │ │
│ 💰 CtaCte    │  │ Estado: [PENDIENTE]  Intentos: 2  Últ. Int.: 13/08 15:30  │ │
│ 🏦 Tesorería │  │ Error: Timeout de red.                                    │ │
│ 📄 Reportes  │  │ Acciones: [ Reintentar ] [ Ver Detalle ]                  │ │
│ ⚙️ Config    │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ V-00095  | Clínica Oeste    | 12/08/2026 | $ 85.000       │ │
│              │  │ Estado: [RECHAZADO]  Intentos: 1  Últ. Int.: 12/08 10:00  │ │
│              │  │ Error: CUIT inválido o inactivo.                          │ │
│              │  │ Acciones: [ Resolver Datos ] [ Ver Detalle ]              │ │
│              │  └───────────────────────────────────────────────────────────┘ │
│              │                                                                │
│              │  ℹ Notas sobre Contingencia:                                   │
│              │  - Escenario A: Falla de ARCA. Reintentar más tarde.           │
│              │  - Escenario B: Datos inválidos. Corregir cliente y reintentar.│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- La alerta global suele aparecer en el dashboard o navbar. Esta pantalla es el listado detallado.
- "Reintentar" lanza nuevamente el job de facturación electrónica.

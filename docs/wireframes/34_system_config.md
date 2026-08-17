<Wireframe: Configuración del Sistema>
**Módulo:** Configuración Global  
**Ruta:** `/admin/config`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-34

## Descripción

Configuraciones globales del negocio, integración fiscal ARCA y umbrales del sistema.

## Estados

### Estado 1: Formulario de Configuración

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Juan Admin] [ADMIN] [Cerrar]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Configuración del Sistema                                    │
│              │                                                               │
│ 📊 Dashboard │  ┌─ Parámetros Comerciales ─────────────────────────────────┐ │
│ 📦 Productos │  │                                                          │ │
│ 📋 Stock     │  │ Tolerancia Dif. Costos (%) [ 5.0 ]                       │ │
│ 🚚 Compras   │  │                                                          │ │
│ 💼 Ventas    │  └──────────────────────────────────────────────────────────┘ │
│ 👥 Clientes  │  ┌─ Integración Fiscal (ARCA) ──────────────────────────────┐ │
│ 🏭 Proveedor.│  │ ℹ Los cambios afectan la facturación inmediatamente.       │ │
│ 💰 CtaCte    │  │                                                          │ │
│ 🏦 Tesorería │  │ Razón Social Emisor: [ Distribuidora Médica S.A.       ] │ │
│ 📄 Reportes  │  │ CUIT Emisor:         [ 30-12345678-9                   ] │ │
│ ⚙️ Config    │  │ Punto de Venta ARCA: [ 0004                            ] │ │
│              │  │ Condición Fiscal:    [v RESPONSABLE_INSCRIPTO          ] │ │
│              │  │                                                          │ │
│              │  └──────────────────────────────────────────────────────────┘ │
│              │                                                               │
│              │                            [ Cancelar ] [ Guardar Cambios ]   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- La Tolerancia de Diferencia de Costos es el porcentaje máximo de variación permitido entre el costo de sistema y el costo en la factura del proveedor antes de marcar la factura como OBSERVADA.
- Condición Fiscal Dropdown: `RESPONSABLE_INSCRIPTO`, `MONOTRIBUTO`, `EXENTO`.

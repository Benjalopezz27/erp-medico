<Wireframe: Bandeja de Revisión de Precios>
**Módulo:** Productos  
**Ruta:** `/prices/review`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-18  

## Descripción
Bandeja de entrada para revisar y aprobar cambios sugeridos en los precios de venta, basándose en la variación de costos. El sistema no modifica precios automáticamente.

## Estados

### Estado 1: Vista Principal (Pendientes)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Productos > Revisión de Precios                               │
│              │                                                                │
│ 📊 Dashboard │  [ 3 revisiones pendientes ]                                   │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  [ PENDIENTE (3) ] [ APROBADO ] [ RECHAZADO ] [ POSPUESTO ]    │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  ┌─────────────────────────────────────────────────────────┐   │
│ 👥 Clientes  │  │ Producto      │ ∆ Costo% │ P.Actual │ P.Sugerido │ ∆ Pr │   │
│ 💰 CtaCte    │  ├───────────────┼──────────┼──────────┼────────────┼──────┤   │
│ 🏦 Tesorería │  │ Jeringa 10ml  │ ⚠ +12.0% │ $ 150.00 │   $ 168.00 │ +12% │   │
│ 📄 Reportes  │  │ Cat: Insumos  │ Costo: $100 -> $112                     │   │
│ ⚙️ Config    │  │ Acciones: [ Aprobar ] [ Custom ] [ Rechazar ] [ Pospon ]│   │
│              │  ├───────────────┼──────────┼──────────┼────────────┼──────┤   │
│              │  │ Gasa 10x10    │   + 5.0% │ $  50.00 │   $  52.50 │  +5% │   │
│              │  │ Cat: Insumos  │ Costo: $30 -> $31.50                    │   │
│              │  │ Acciones: [ Aprobar ] [ Custom ] [ Rechazar ] [ Pospon ]│   │
│              │  └─────────────────────────────────────────────────────────┘   │
│              │                                                                │
│              │  ℹ El sistema NUNCA modifica precios automáticamente.          │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Aprobación Custom (Edición en línea)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  │ Jeringa 10ml  │ ⚠ +12.0% │ $ 150.00 │ [ $ 165.00 ] │ +10% │   │
│  │ Cat: Insumos  │ Costo: $100 -> $112                     │   │
│  │ Acciones: [ Guardar ] [ Cancelar ]                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- "Aprobar con Precio Custom" (Custom) abre un input en lugar del texto del precio sugerido.
- La diferencia de costo (`∆ Costo%`) se resalta si es muy alta.
- Al aprobar, el precio se actualiza inmediatamente en el catálogo.

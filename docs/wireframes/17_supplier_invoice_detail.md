<Wireframe: Detalle de Factura de Proveedor>
**Módulo:** Compras  
**Ruta:** `/purchases/supplier-invoices/:id`  
**Rol(es):** ADMINISTRADOR | VENDEDOR (solo lectura)  
**Sprint:** Sprint 4 — US-17  

## Descripción
Muestra el detalle de una factura de proveedor y su conciliación contra la recepción de mercadería. Muestra advertencias de diferencia de costos y permite ajustes posteriores.

## Estados

### Estado 1: Factura OBSERVADA (Requiere Autorización)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Compras > Facturas de Proveedores > FC-0012-58                │
│              │                                                                │
│ 📊 Dashboard │  Factura: FC-0012-58  |  Proveedor: BioInsumos SA              │
│ 📦 Productos │  Fecha: 12/08/2026    |  Recepción: [ RC-105 ↗ ]               │
│ 📋 Stock     │  Estado: [ OBSERVADA ]                                         │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  [ ⚠ Diferencia de costo del 12.0% supera tolerancia (5%) ]    │
│ 👥 Clientes  │  [ Autorizar ➔ ] [ Rechazar ✗ ]                                │
│ 💰 CtaCte    │                                                                │
│ 🏦 Tesorería │  Detalle de Ítems:                                             │
│ 📄 Reportes  │  ┌─────────────────────────────────────────────────────────┐   │
│ ⚙️ Config    │  │ Producto        │ Cant (R/F) │ Costo(P/F) │ Dif $ │ Dif%│   │
│              │  ├─────────────────┼────────────┼────────────┼───────┼─────┤   │
│              │  │ Jeringa 10ml    │ 1000/1000  │  $100/$112 │  $ 12 │ 12% │   │
│              │  │ Guantes Latex M │  500/ 500  │  $250/$250 │  $  0 │  0% │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Factura CONFIRMADA (Muestra Ajuste de Costos)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Compras > Facturas de Proveedores > FC-0012-44                │
│              │                                                                │
│ 📊 Dashboard │  Factura: FC-0012-44  |  Proveedor: MedTech BA                 │
│ 📦 Productos │  Fecha: 10/08/2026    |  Recepción: [ RC-102 ↗ ]               │
│ 📋 Stock     │  Estado: [ CONFIRMADA ]                                        │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  Ajuste de Costos Generado:                                    │
│ 👥 Clientes  │  ┌─────────────────────────────────────────────────────────┐   │
│ 💰 CtaCte    │  │ Producto        │ ∆ Costo │ Stock │ Reval  │ COGS Ajust │   │
│ 🏦 Tesorería │  ├─────────────────┼─────────┼───────┼────────┼────────────┤   │
│ 📄 Reportes  │  │ Aguja 21G       │ + $5.00 │   800 │ $4.000 │        $0  │   │
│ ⚙️ Config    │  │ (200 unidades ya vendidas, ajuste a COGS: $1.000)       │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Estado VALIDANDO: similar a OBSERVADA pero sin banner de alerta y sin botones de Autorizar/Rechazar si está dentro de la tolerancia (se auto-confirma o requiere confirmación normal).
- El sistema de ajuste (COGS Ajuste) muestra cómo impacta la diferencia de precios en la mercadería que ya fue vendida vs la que sigue en stock.
- Solo el ADMINISTRADOR ve los botones de Autorizar/Rechazar.

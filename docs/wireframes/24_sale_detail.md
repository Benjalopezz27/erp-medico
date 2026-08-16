<Wireframe: Detalle de Venta>
**Módulo:** Ventas  
**Ruta:** `/sales/:id`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 2 — US-07  

## Descripción
Visualización detallada de una venta, incluyendo estado del documento fiscal, y gestión de devoluciones.

## Estados

### Estado 1: Venta Confirmada y Factura Emitida

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Ventas > Listado > Detalle Venta V-00102                      │
│              │                                                                │
│ 📊 Dashboard │  N° Venta: V-00102        Fecha: 14/08/2026 10:30              │
│ 📦 Productos │  Cliente: Farmacia del Sud                                     │
│ 📋 Stock     │  Vendedor: J. Pérez       Estado: [CONFIRMADA]                 │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  ┌───────────────────────────────────────────────────────────┐ │
│ 👥 Clientes  │  │ Ítems:                                                    │ │
│ 💰 CtaCte    │  │ Producto        | Cantidad | P. Unit. | Desc% | Total     │ │
│ 🏦 Tesorería │  │ Paracetamol 1g  | 10       | $ 500    | 0%    | $ 5.000   │ │
│ 📄 Reportes  │  │ Amoxicilina 500 | 5        | $ 1.500  | 0%    | $ 7.500   │ │
│ ⚙️ Config    │  ├───────────────────────────────────────────────────────────┤ │
│              │  │ Subtotal: $ 12.500 | IVA: $ 2.625 | TOTAL: $ 15.125       │ │
│              │  └───────────────────────────────────────────────────────────┘ │
│              │                                                                │
│              │  Documento Fiscal:                                             │
│              │  Estado: [EMITIDO] ✓ Factura B N° 0003-0000102                 │
│              │  CAE: 73000012345678  Vto CAE: 24/08/2026                      │
│              │  [ Descargar PDF ] [ Ver QR ]                                  │
│              │                                                                │
│              │  Devoluciones:                                                 │
│              │  [ Registrar Devolución ]                                      │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Factura Pendiente y Formulario de Devolución

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Ventas > Listado > Detalle Venta V-00101                      │
│              │                                                                │
│ 💼 Ventas    │  Documento Fiscal:                                             │
│              │  Estado: ⚠ [PENDIENTE_FACTURACION] (Hubo un error de red)      │
│              │  [ Reintentar Facturación ]                                    │
│              │                                                                │
│              │  Devoluciones:                                                 │
│              │  ┌─────────────────────────────────────────────────────────┐   │
│              │  │ Seleccionar ítems a devolver:                           │   │
│              │  │ [x] Paracetamol 1g | Cant: [ 2]/10 | (•) Apto ( ) Dañado│   │
│              │  │ [ ] Amoxicilina 500| Cant: [  ]/5  | ( ) Apto ( ) Dañado│   │
│              │  │ [ CONFIRMAR DEVOLUCIÓN ] [ CANCELAR ]                   │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- La devolución requiere indicar si el producto vuelve al stock APTO (disponible) o NO_APTO (cuarentena/dañado).

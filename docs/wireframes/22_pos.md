<Wireframe: POS Nueva Venta>
**Módulo:** Ventas  
**Ruta:** `/sales/new`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 2 — US-05  

## Descripción
Pantalla de Punto de Venta (POS) para crear nuevas ventas, con búsqueda rápida de productos, panel de totales, y selección múltiple de medios de pago.

## Estados

### Estado 1: Formulario Activo y Validaciones

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Pérez] [VENDEDOR] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Ventas > Nueva Venta                                          │
│              │                                                                │
│ 📊 Dashboard │  ┌─────────────────────────────────┬───────────────────────┐   │
│ 📦 Productos │  │ [ Búsqueda de Productos...  🔎] │ Cliente               │   │
│ 📋 Stock     │  │                                 │ [v Farmacia del Sud ] │   │
│ 🚚 Compras   │  │ ─────────────────────────────── │                       │   │
│ 💼 Ventas    │  │ # | Producto     | Cant| P.Unit | ───────────────────── │   │
│ 👥 Clientes  │  │ 1 | Paracetamol  | [ 10]| $ 500 │ Medios de Pago        │   │
│ 💰 CtaCte    │  │   | 1g (Caja x50)|     |        │ Efectivo:  [ $ 5.000] │   │
│ 🏦 Tesorería │  │   |              |     |        │ Transf.:   [ $     0] │   │
│ 📄 Reportes  │  │ 2 | Jeringa 5ml  |[100]| $  80 │ Cheque:    [ $     0] │   │
│ ⚙️ Config    │  │   | ⚠ Stock insuf|     |        │                       │   │
│              │  │ 3 | Amoxicilina  | [  5]| $1500 │ ───────────────────── │   │
│              │  │                                 │ Opciones de Venta     │   │
│              │  │                                 │ [x] Requiere Factura  │   │
│              │  │                                 │ [x] Venta a Crédito   │   │
│              │  │                                 │ ⚠ Crédito exige Fact. │   │
│              │  │                                 │                       │   │
│              │  │                                 │ ───────────────────── │   │
│              │  │                                 │ Subtotal:   $  20.500 │   │
│              │  │ Subtotal de Ítems:   $ 20.500   │ IVA 21%:    $   4.305 │   │
│              │  │                                 │ TOTAL:      $  24.805 │   │
│              │  │                                 │ [ CONFIRMAR VENTA ]   │   │
│              │  └─────────────────────────────────┴───────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- El layout está dividido 60/40.
- Si se selecciona `Venta a Crédito`, el checkbox `Requiere Factura` se tilda y deshabilita automáticamente.
- El stock se valida inline en la fila del producto (ej: "Stock insuf").
- La suma de Efectivo + Transf + Cheque debe coincidir con el TOTAL si no es venta a crédito (o en su defecto si es pago parcial).

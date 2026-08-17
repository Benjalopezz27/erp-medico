<Wireframe: Formulario de Producto>
**Módulo:** Productos  
**Ruta:** `/products/new` y `/products/:id/edit`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 1 — US-04

## Descripción

Formulario para crear o editar la ficha técnica, comercial y de stock de un producto médico.

## Estados

### Estado 1: Creación de Producto (New)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Productos / Nuevo Producto                                   │
│              │                                                               │
│ 📊 Dashboard │  ■ DATOS GENERALES                                            │
│ 📦 Productos │  Código Interno *      Nombre *                               │
│ 📋 Stock     │  [ JER-10_________ ]   [ Jeringa 10ml sin aguja x100____ ]    │
│ 🚚 Compras   │  Categoría *           Unidad Base *                          │
│ 💼 Ventas    │  [ Descartables  v ]   [ Caja                          v ]    │
│ 👥 Clientes  │  Descripción                                                  │
│ 💰 CtaCte    │  [ Jeringa descartable 10ml pico luer slip. Caja x 100u.   ]  │
│ 🏦 Tesorería │  [                                                         ]  │
│ 📄 Reportes  │                                                               │
│ ⚙️ Config    │  ■ CONFIGURACIÓN DE PRECIOS                                   │
│              │  Costo Neto ($) *  Markup (%) *   Prec Sugerido   Precio Activo($)*│
│              │  [ 3500.00       ] [ 40.00    ]   $ 4900.00     [ 4900.00       ]│
│              │                                                               │
│              │  ■ STOCK                                                      │
│              │  Stock Mínimo *                                               │
│              │  [ 50            ]                                            │
│              │                                                               │
│              │  ■ CONVERSIONES DE UNIDADES              [+ Agregar Conversión] │
│              │  ┌────────────────────┬──────────┬──────────────────────────┐ │
│              │  │ Unidad Presentación│ Factor   │ Equivalencia             │ │
│              │  ├────────────────────┼──────────┼──────────────────────────┤ │
│              │  │ [ Bulto          v]│ [ 10   ] │ 1 Bulto = 10 Cajas       │ │
│              │  └────────────────────┴──────────┴──────────────────────────┘ │
│              │                                                               │
│              │                                [ Cancelar ] [ Guardar Prod. ] │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Edición (Edit)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Productos / Editar / JER-10                                  │
│              │                                                               │
│ 📊 Dashboard │  ■ DATOS GENERALES                                            │
│ 📦 Productos │  Código Interno (Bloqueado) Nombre *                          │
│ 📋 Stock     │  [ JER-10          ]🔒 [ Jeringa 10ml sin aguja x100____ ]    │
│ 🚚 Compras   │                                                               │
│ ...          │  (Resto del formulario igual que en creación)                 │
│              │                                                               │
│              │  ⚠ El Costo Neto fue actualizado por última vez el 12/08/2026 │
│              │                                                               │
│              │                                [ Cancelar ] [ Guardar Cambios]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Precio Sugerido = Costo Neto * (1 + Markup / 100). Es read-only y se recalcula en tiempo real.
- El Código Interno no se puede cambiar una vez creado el producto.
- En la grilla de conversiones, la 'Equivalencia' es un texto generado dinámicamente ("1 {Unidad Presentación} = {Factor} {Unidad Base}").

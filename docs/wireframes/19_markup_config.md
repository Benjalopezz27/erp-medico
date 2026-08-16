<Wireframe: Configuración de Markups>
**Módulo:** Configuración / Precios  
**Ruta:** `/admin/markups`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-19  

## Descripción
Define las reglas de rentabilidad (markup) para calcular los precios sugeridos en base a los costos. Soporta jerarquía: Producto > Categoría > Global.

## Estados

### Estado 1: Vista General

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Admin] [ADMIN] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Configuración > Markups (Márgenes de Ganancia)                │
│              │                                                                │
│ 📊 Dashboard │  ℹ Jerarquía: Producto sobrescribe Categoría, y Categoría    │
│ 📦 Productos │  sobrescribe al Global.                                        │
│ 📋 Stock     │                                                                │
│ 🚚 Compras   │  ▼ 1. Markup Global                                            │
│ 💼 Ventas    │  [ 35.00 ] %  [ Guardar Global ]                               │
│ 👥 Clientes  │                                                                │
│ 💰 CtaCte    │  ▼ 2. Markup por Categoría                                     │
│ 🏦 Tesorería │  ┌─────────────────────────────────────────────────────────┐   │
│ 📄 Reportes  │  │ Categoría         │ Markup % │ Acciones                 │   │
│ ⚙️ Config    │  ├───────────────────┼──────────┼──────────────────────────┤   │
│              │  │ Descartables      │    25.00 │ [ Editar ] [ Eliminar ]  │   │
│              │  │ Equipamiento      │    40.00 │ [ Editar ] [ Eliminar ]  │   │
│              │  ├───────────────────┴──────────┴──────────────────────────┤   │
│              │  │ [+] Agregar Excepción de Categoría                      │   │
│              │  └─────────────────────────────────────────────────────────┘   │
│              │                                                                │
│              │  ▼ 3. Markup por Producto                                      │
│              │  Buscar Producto: [ 🔍 Jeringa...                    ]         │
│              │  ┌─────────────────────────────────────────────────────────┐   │
│              │  │ Producto          │ Markup % │ Acciones                 │   │
│              │  ├───────────────────┼──────────┼──────────────────────────┤   │
│              │  │ Jeringa 50ml      │    15.00 │ [ Editar ] [ Eliminar ]  │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Al agregar una excepción por producto, se usa un componente buscador asíncrono de productos.
- Preview (no graficado por espacio): Al lado del input de edición, podría mostrarse un simulador "Costo $100 -> Precio Venta $135".

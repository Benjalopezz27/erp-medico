<Wireframe: Lista de Productos>
**Módulo:** Productos  
**Ruta:** `/products`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 1 — US-03  

## Descripción
Pantalla principal del catálogo de productos médicos. Permite buscar, filtrar y acceder a la edición o detalle de stock.

## Estados

### Estado 1: Lista Cargada

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Productos / Catálogo                                         │
│              │                                                               │
│ 📊 Dashboard │  Filtros:                                                     │
│ 📦 Productos │  [ Buscar por cód/nombre... ] [Categoría v] [Estado v]        │
│ 📋 Stock     │                                          [ + Nuevo Producto ] │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │ ┌─────────┬────────────────────────┬─────────┬───────┬───────┬─────────┬───────┬────────┐ │
│ 👥 Clientes  │ │ Código  │ Nombre                 │ Categor │ Unid. │ Stock │ Precio  │ Markup│ Estado │ │
│ 💰 CtaCte    │ ├─────────┼────────────────────────┼─────────┼───────┼───────┼─────────┼───────┼────────┤ │
│ 🏦 Tesorería │ │ JER-05  │ Jeringa 5ml x100       │ Descart │ Caja  │   450 │ $ 4,500 │  30%  │ ACTIVO │ │
│ 📄 Reportes  │ │ GAS-10  │ Gasa Estéril 10x10 cm  │ Insumos │ Paq.  │ 1,200 │ $ 1,200 │  40%  │ ACTIVO │ │
│ ⚙️ Config    │ │ SUE-F1  │ Suero Fisiológico 1L   │ Soluc.  │ Bot.  │    50 │ $ 2,100 │  25%  │ ACTIVO │ │
│              │ │ CAT-20G │ Catéter IV 20G         │ Descart │ Unid. │     0 │ $   850 │  50%  │ ACTIVO │ │
│              │ │ GUA-L-M │ Guante Látex Med x100  │ Insumos │ Caja  │   300 │ $ 8,900 │  35%  │ INACT  │ │
│              │ └─────────┴────────────────────────┴─────────┴───────┴───────┴─────────┴───────┴────────┘ │
│              │                                                               │
│              │ Mostrando 1-5 de 142                         [<] [1] [2] [3] [>]│
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Sin Resultados (Empty State)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Productos / Catálogo                                         │
│              │                                                               │
│ 📊 Dashboard │  Filtros:                                                     │
│ 📦 Productos │  [ "Bisturí Láser"......... ] [Equipam.  v] [Activosv]        │
│ 📋 Stock     │                                          [ + Nuevo Producto ] │
│ 🚚 Compras   │                                                               │
│ 💼 Ventas    │      ┌─────────────────────────────────────────────────┐      │
│ 👥 Clientes  │      │                       ℹ                         │      │
│ 💰 CtaCte    │      │         No se encontraron productos.            │      │
│ 🏦 Tesorería │      │    Intenta modificando los filtros de búsqueda. │      │
│ 📄 Reportes  │      └─────────────────────────────────────────────────┘      │
│ ⚙️ Config    │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- VENDEDOR no ve el botón `[ + Nuevo Producto ]` ni la columna Markup.
- Al hacer clic en la fila se abre un menú contextual: `[ Editar ]`, `[ Ver Stock ]`.

<Wireframe: Detalle de Cliente>
**Módulo:** Clientes  
**Ruta:** `/customers/:id`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 4 — US-21

## Descripción

Vista unificada del cliente, mostrando sus datos, precios especiales asignados y su cuenta corriente detallada.

## Estados

### Estado 1: Pestaña de Cuenta Corriente (Default desde módulo CtaCte)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [Rol] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Clientes > Clínica del Sol                                    │
│              │                                                                │
│ 📊 Dashboard │  [ Información ]  [ Precios Especiales ]  [ Cuenta Corriente ] │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  Resumen Cta. Cte.:                                            │
│ 🚚 Compras   │  Saldo Total: $ 1.250.000  | Límite Crédito: $ 5.000.000       │
│ 💼 Ventas    │  Facturas Pendientes: 3    | Facturas Parciales: 1             │
│ 👥 Clientes  │  [ Registrar Cobro ] [ Exportar PDF ]                          │
│ 💰 CtaCte    │                                                                │
│ 🏦 Tesorería │  Movimientos (Ledger):                                         │
│ 📄 Reportes  │  ┌─────────────────────────────────────────────────────────┐   │
│ ⚙️ Config    │  │ Fecha │ Tipo     │ Documento │ Importe     │ Saldo      │   │
│              │  ├───────┼──────────┼───────────┼─────────────┼────────────┤   │
│              │  │ 12/08 │ Fac (A)  │ 0001-0023 │ $ 1.250.000 │ $ 1.250.000│   │
│              │  │ 10/08 │ Recibo   │ RC-0044   │-$   500.000 │ $         0│   │
│              │  │ 05/08 │ Fac (A)  │ 0001-0012 │ $   500.000 │ $   500.000│   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Pestaña Precios Especiales

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [ Información ]  [ Precios Especiales ]  [ Cuenta Corriente ]                │
│                                                                              │
│  Agregar Precio Especial:                                                    │
│  Producto: [ 🔍 Buscar producto... ] % Desc: [ 10 ]  [ + Agregar ]           │
│                                                                              │
│  Lista de Precios Acordados:                                                 │
│  ┌─────────────────────────────────────────────────────────┐                 │
│  │ Producto        │ P. Catálogo │ % Desc │ P. Especial    │                 │
│  ├─────────────────┼─────────────┼────────┼────────────────┤                 │
│  │ Jeringa 10ml    │ $ 150.00    │   10%  │ $ 135.00       │ [ Quitar ]      │
│  │ Gasa 10x10      │ $  50.00    │   20%  │ $  40.00       │ [ Quitar ]      │
│  └─────────────────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- La pestaña activa dependerá desde dónde accede el usuario. Si entra desde CtaCte, default = Cuenta Corriente.
- Los precios especiales se aplican por sobre cualquier otra regla de precios durante la Venta.
- "Registrar Cobro" redirigirá a Tesorería o abrirá un modal de recibos imputando las facturas pendientes.

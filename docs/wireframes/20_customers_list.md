<Wireframe: Lista de Clientes>
**Módulo:** Clientes  
**Ruta:** `/customers`  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 4 — US-20  

## Descripción
Directorio de clientes de la distribuidora. Permite visualizar deuda rápidamente y gestionar datos fiscales.

## Estados

### Estado 1: Vista Principal con Filtros

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [Rol] [Cerrar ↩]  │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Clientes > Listado                                            │
│              │                                                                │
│ 📊 Dashboard │  [ + Nuevo Cliente ]                                           │
│ 📦 Productos │                                                                │
│ 📋 Stock     │  Buscar: [________________]  Cond. Fiscal: [v Todas     ]      │
│ 🚚 Compras   │                                                                │
│ 💼 Ventas    │  ┌─────────────────────────────────────────────────────────┐   │
│ 👥 Clientes  │  │ Nombre / Razón Social │ DNI/CUIT │ Cond. Fiscal │ Tel.  │   │
│ 💰 CtaCte    │  ├───────────────────────┼──────────┼──────────────┼───────┤   │
│ 🏦 Tesorería │  │ Clinica del Sol       │ 30-123.. │ Resp. Inscr. │ 455.. │   │
│ 📄 Reportes  │  │ Lim: $5M | Saldo: ⚠ $ 1.2M | [ACTIVO]   [ Ver ] [ Editar] │   │
│ ⚙️ Config    │  ├───────────────────────┼──────────┼──────────────┼───────┤   │
│              │  │ Dr. Juan Perez        │ 20-456.. │ Monotributo  │ 15-.. │   │
│              │  │ Lim: $1M | Saldo: $ 0.0      | [ACTIVO]   [ Ver ] [ Editar] │   │
│              │  └─────────────────────────────────────────────────────────┘   │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Modal Nuevo Cliente (Superpuesto)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Alta de Cliente                                                   [ x ]     │
│  ─────────────────────────────────────────────────────────────────────────   │
│  Razón Social: [___________________________]                                 │
│  CUIT/DNI:     [___________________________]                                 │
│  Cond. Fiscal: [v Responsable Inscripto  ]                                   │
│  Teléfono:     [___________________________]                                 │
│  Email:        [___________________________]                                 │
│  Dirección:    [___________________________]                                 │
│  Límite Créd.: [ $ 5.000.000               ]                                 │
│                                                                              │
│  [ Cancelar ]                                              [ Guardar ]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- El saldo en cuenta corriente (Saldo CtaCte) se muestra en rojo y con alerta si el cliente tiene deuda pendiente, caso contrario en negro/gris.
- Límite de Crédito define el máximo saldo adeudado permitido antes de bloquear ventas a cuenta.

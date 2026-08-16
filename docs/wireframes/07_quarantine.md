<Wireframe: Gestión de Cuarentena>
**Módulo:** Stock  
**Ruta:** `/stock/quarantine`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-07  

## Descripción
Panel para gestionar productos apartados del stock disponible (mercadería vencida, dañada, a revisar o devolver).

## Estados

### Estado 1: Tabla de Cuarentena

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Usuario] [ADMIN] [Cerrar ↩] │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Stock / Cuarentena                                           │
│              │                                                               │
│ 📊 Dashboard │  Filtros:                                                     │
│ 📦 Productos │  [ Buscar producto... ]  [ Estado: Todos v ]                  │
│ 📋 Stock     │                                                               │
│ 🚚 Compras   │ ┌──────────────────────┬─────┬────────────────┬──────────┬───────────┬─────────┐ │
│ 💼 Ventas    │ │ Producto             │Cant.│ Motivo Ingreso │ F.Ingreso│ Estado    │ Acciones│ │
│ 👥 Clientes  │ ├──────────────────────┼─────┼────────────────┼──────────┼───────────┼─────────┤ │
│ 💰 CtaCte    │ │ Gasa Estéril 10x10   │  10 │ Cajas mojadas  │ 12/08/26 │ EN_CUAREN │ [ v ]   │ │
│ 🏦 Tesorería │ │ Jeringa 5ml x100     │   2 │ Lote Vencido   │ 10/08/26 │ MERMA_CONF│ [ v ]   │ │
│ 📄 Reportes  │ │ Catéter IV 20G       │  50 │ Falla fábrica  │ 01/08/26 │ ESPER_DEV │ [ v ]   │ │
│ ⚙️ Config    │ └──────────────────────┴─────┴────────────────┴──────────┴───────────┴─────────┘ │
│              │                                                               │
│              │ * El stock en cuarentena NO computa para la venta disponible. │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Acciones Dropdown y Modal de Reingreso

```text
Menú desplegable en columna 'Acciones':
┌───────────────────────┐
│ Confirmar Merma       │
│ Devolver a Proveedor  │
│ Reingresar a Stock    │
└───────────────────────┘

Al seleccionar "Reingresar a Stock":
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│    ┌────────────────────────────────────────────────────────────────┐        │
│    │  REINGRESAR A STOCK DISPONIBLE                              [x]│        │
│    │                                                                │        │
│    │  Estás a punto de reingresar 10 Paq. de "Gasa Estéril 10x10"   │        │
│    │  al stock general.                                             │        │
│    │                                                                │        │
│    │  Autorizador (Requerido) *                                     │        │
│    │  [ Juan Pérez (Admin)                                   v ]    │        │
│    │                                                                │        │
│    │  Motivo de Reingreso *                                         │        │
│    │  [ Mercadería revisada y en óptimas condiciones.          ]    │        │
│    │                                                                │        │
│    │                                 [ Cancelar ] [ Confirmar ]     │        │
│    └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Regla crítica: El stock en esta tabla está completamente aislado del stock para ventas.
- Reingresar requiere confirmación y registro en el ledger como ingreso desde cuarentena.
- Las acciones cambian el estado del lote en cuarentena o lo eliminan de esta tabla (en caso de reingreso o destrucción/merma total).

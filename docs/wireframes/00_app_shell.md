<Wireframe: App Shell>
**Módulo:** Layout  
**Ruta:** `/*` (Protected)  
**Rol(es):** ADMINISTRADOR | VENDEDOR  
**Sprint:** Sprint 1 — US-01  

## Descripción
El contenedor principal de la aplicación con la barra lateral de navegación (sidebar) y la barra superior (topbar).

## Estados

### Estado 1: App Shell - ADMINISTRADOR

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Juan Admin] [ADMIN] [Cerrar]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  [BREADCRUMB: Inicio > Dashboard]                             │
│              │                                                               │
│ 📊 Dashboard │  ┌─────────────────────────────────────────────────────────┐  │
│ 📦 Productos │  │                                                         │  │
│ 📋 Stock     │  │                                                         │  │
│ 🚚 Compras   │  │                                                         │  │
│ 💼 Ventas    │  │                                                         │  │
│ 👥 Clientes  │  │                  [ ÁREA DE CONTENIDO ]                  │  │
│ 🏭 Proveedor.│  │                                                         │  │
│ 💰 CtaCte    │  │                                                         │  │
│ 🏦 Tesorería │  │                                                         │  │
│ 📄 Reportes  │  │                                                         │  │
│ ⚙️ Config    │  └─────────────────────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: App Shell - VENDEDOR (Navegación Restringida)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                   [Ana Ventas] [VENDEDOR] [Cerrar]
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  [BREADCRUMB: Inicio > Dashboard]                             │
│              │                                                               │
│ 📊 Dashboard │  ┌─────────────────────────────────────────────────────────┐  │
│ 📦 Productos │  │                                                         │  │
│ 📋 Stock     │  │                                                         │  │
│ 💼 Ventas    │  │                                                         │  │
│ 👥 Clientes  │  │                  [ ÁREA DE CONTENIDO ]                  │  │
│              │  │                                                         │  │
│              │  │                                                         │  │
│              │  │                                                         │  │
│              │  │                                                         │  │
│              │  │                                                         │  │
│              │  └─────────────────────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- El layout es persistente. El contenido principal se carga en el [ÁREA DE CONTENIDO].
- Las opciones de menú ocultas para VENDEDOR son inaccesibles (protegidas en frontend y backend).

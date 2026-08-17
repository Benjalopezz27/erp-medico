<Wireframe: Gestión de Usuarios>
**Módulo:** Configuración / Usuarios  
**Ruta:** `/admin/users`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 4 — US-33

## Descripción

Pantalla para administrar el acceso al sistema. Solo visible para administradores.

## Estados

### Estado 1: Listado de Usuarios

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [Juan Admin] [ADMIN] [Cerrar]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Usuarios                                        [ + Usuario ]│
│              │                                                               │
│ 📊 Dashboard │  ┌────────────────┬───────────────────┬──────────┬─────┬────┐ │
│ 📦 Productos │  │ Nombre         │ Email             │ Rol      │ Act │ Acc│ │
│ 📋 Stock     │  ├────────────────┼───────────────────┼──────────┼─────┼────┤ │
│ 🚚 Compras   │  │ Juan Admin     │ juan@erp.com      │ ADMIN    │ [x] │ ✏️ 🗑│ │
│ 💼 Ventas    │  │ Ana Ventas     │ ana@erp.com       │ VENDEDOR │ [x] │ ✏️ 🗑│ │
│ 👥 Clientes  │  │ Carlos Temp    │ carlos@erp.com    │ VENDEDOR │ [ ] │ ✏️ 🗑│ │
│ 🏭 Proveedor.│  └────────────────┴───────────────────┴──────────┴─────┴────┘ │
│ 💰 CtaCte    │                                                               │
│ 🏦 Tesorería │                                                               │
│ 📄 Reportes  │                                                               │
│ ⚙️ Config    │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Modal Crear/Editar Usuario y Alerta

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│    ┌────────────────────────────────────────────────────────┐                │
│    │ Editar Usuario                                    [X]  │                │
│    ├────────────────────────────────────────────────────────┤                │
│    │                                                        │                │
│    │ Nombre: [ Ana Ventas                             ]     │                │
│    │ Email:  [ ana@erp.com                            ]     │                │
│    │ Rol:    [v VENDEDOR                              ]     │                │
│    │                                                        │                │
│    │ [x] Usuario Activo (puede iniciar sesión)              │                │
│    │                                                        │                │
│    │ ⚠ No se puede eliminar al usuario porque tiene         │                │
│    │ transacciones asociadas (Ventas). Puedes desactivarlo. │                │
│    │                                                        │                │
│    │                           [ Cancelar ] [ Guardar ]     │                │
│    └────────────────────────────────────────────────────────┘                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Al intentar eliminar un usuario con ventas o acciones previas, el sistema muestra error/alerta impidiendo la eliminación (integridad referencial). Se debe usar "Desactivar" en su lugar.
- Dropdown de roles: `ADMINISTRADOR`, `VENDEDOR`.

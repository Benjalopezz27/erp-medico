</Agent System Instructions>
<Wireframe: Proveedores - Listado>
**Módulo:** Proveedores  
**Ruta:** `/suppliers`  
**Rol(es):** ADMINISTRADOR  
**Sprint:** Sprint 2 — US-09  

## Descripción
Listado de proveedores del sistema. Permite la búsqueda, creación, edición de proveedores y el acceso rápido a sus medios de contacto, así como a su catálogo específico de productos.

## Estados

### Estado 1: Listado Principal

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🏥 ERP Distribuidora Médica                     [J. Perez] [ADMIN] [Cerrar ↩]│
├──────────────┬───────────────────────────────────────────────────────────────┤
│ MENÚ         │  Inicio > Proveedores                                         │
│              │                                                               │
│ 📊 Dashboard │  PROVEEDORES                                                  │
│ 📦 Productos │  [ Buscar por Razón Social o CUIT... ]  [ + Nuevo Proveedor ] │
│ 📋 Stock     │                                                               │
│ 🚚 Compras   │  ┌─────────────────────────────────────────────────────────┐  │
│ 💼 Ventas    │  │ Razón Social      │ CUIT        │ Teléfono │ Email      │  │
│ 👥 Clientes  │  ├───────────────────┼─────────────┼──────────┼────────────┤  │
│ 💰 CtaCte    │  │ 3M Argentina      │ 30-123456-9 │ 4321-000 │ @3m.com    │  │
│ 🏦 Tesorería │  │ ↳ [Editar] [Catálogo] [Whatsapp] [Email]                 │  │
│ 📄 Reportes  │  ├───────────────────┼─────────────┼──────────┼────────────┤  │
│ ⚙️ Config    │  │ Propato Hnos      │ 30-987654-3 │ 4567-111 │ @prop.com  │  │
│              │  │ ↳ [Editar] [Catálogo] [Whatsapp] [Email]                 │  │
│              │  └─────────────────────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

### Estado 2: Modal Crear/Editar Proveedor

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Crear/Editar Proveedor                                                [ X ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Razón Social:    [____________________________________________________]      │
│ CUIT:            [______________________]                                    │
│ Dirección:       [____________________________________________________]      │
│ Teléfono:        [______________________]                                    │
│ WhatsApp:        [______________________] (Para wa.me)                       │
│ Email:           [____________________________________________________]      │
│ Cond. Fiscal:    [v Responsable Inscripto                             ]      │
│ Estado:          [ x ] Activo                                                │
│                                                                              │
│                                           [ Cancelar ] [ Guardar ]           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción
- Botones de "Whatsapp" y "Email" abren una nueva pestaña con links `wa.me/<numero>` y `mailto:<email>`.
- Validar formato de CUIT.
- El catálogo dirige a `/suppliers/:id/catalog`.

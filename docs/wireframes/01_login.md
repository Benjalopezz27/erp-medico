<Wireframe: Login>
**Módulo:** Autenticación  
**Ruta:** `/login`  
**Rol(es):** N/A  
**Sprint:** Sprint 1 — US-02

## Descripción

Pantalla de acceso al sistema. No muestra el app shell. Ocupa toda la pantalla centrando la tarjeta de inicio de sesión.

## Estados

### Estado 1: Formulario Vacío

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                                                                              │
│                         ┌──────────────────────────┐                         │
│                         │ 🏥 ERP Distribuidora     │                         │
│                         │                          │                         │
│                         │ Email                    │                         │
│                         │ [______________________] │                         │
│                         │                          │                         │
│                         │ Contraseña               │                         │
│                         │ [______________________] │                         │
│                         │                          │                         │
│                         │   [ Iniciar Sesión ]     │                         │
│                         └──────────────────────────┘                         │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estado 2: Error de Credenciales

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                                                                              │
│                         ┌──────────────────────────┐                         │
│                         │ 🏥 ERP Distribuidora     │                         │
│                         │                          │                         │
│                         │ ✗ Credenciales inválidas │                         │
│                         │                          │                         │
│                         │ Email                    │                         │
│                         │ [usuario@empresa.com___] │                         │
│                         │                          │                         │
│                         │ Contraseña               │                         │
│                         │ [••••••••              ] │                         │
│                         │                          │                         │
│                         │   [ Iniciar Sesión ]     │                         │
│                         └──────────────────────────┘                         │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Notas de Interacción

- Al iniciar sesión exitosamente, se redirecciona al dashboard (`/`).
- La redirección varía lógicamente (el dashboard carga distintos KPIs según el rol), pero la ruta es la misma.

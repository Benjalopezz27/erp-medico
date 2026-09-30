# Spec Delta

## Purpose

Permite a un administrador ver y aprobar cuentas autoregistradas.

## ADDED Requirements

### Requirement: Listado y aprobación de cuentas pendientes

El sistema SHALL permitir a un `ADMINISTRADOR` listar usuarios con `isActive=false` (`GET /users?isActive=false`) y activarlos con `PATCH /users/:id {isActive:true}`. Ambos endpoints SHALL seguir siendo admin-only.

#### Scenario: Admin aprueba cuenta

- **WHEN** el admin confirma "Aprobar" sobre un usuario inactivo
- **THEN** el usuario pasa a `isActive=true`, se muestra un toast de éxito y el listado se refresca

#### Scenario: No admin

- **WHEN** un `VENDEDOR` llama a los endpoints
- **THEN** responde 403

#### Scenario: Cuenta aprobada puede loguear

- **WHEN** una cuenta aprobada envía credenciales correctas
- **THEN** recibe JWT

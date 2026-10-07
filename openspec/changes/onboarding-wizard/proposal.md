# Proposal

## Why

El ERP es de puesto único y necesita datos maestros en varios módulos (fiscal, usuarios, categorías/unidades, productos, clientes, proveedores, tesorería, stock) antes de poder vender o facturar. Hoy se cargan a mano, sin guía ni validación de completitud: arrancar con configuración incompleta produce desde un comprobante ARCA mal emitido hasta ventas contra stock o precios sin cargar. Issue #239.

## What Changes

- Wizard multi-paso en `apps/frontend/src/features/onboarding` con 7 pasos: Empresa y fiscal, Usuarios, Categorías y unidades, Productos/precios/costos (omitible), Clientes y proveedores (omitible), Tesorería, Stock inicial (omitible si se omitió productos).
- Nuevo `GET /config/onboarding-status`: pasos completos/pendientes por módulo.
- Estado persistido (no en memoria) como claves de `system_settings`: `onboarding_completed` y pasos completados/omitidos. Reentrante.
- Guard backend que responde **428** con el paso pendiente en endpoints operativos (ventas, stock, facturación) mientras `onboarding_completed = false`; el frontend redirige al wizard y bloquea el resto de la navegación.
- Migración de **solo backfill**: instalaciones con datos existentes quedan `onboarding_completed = true`. Sin tablas ni columnas nuevas.
- El wizard no agrega lógica de negocio: cada paso llama a los endpoints existentes de su módulo.
- El certificado ARCA **no se sube**: el paso fiscal solo verifica el cert configurado por entorno vía `IArcaService` / `/arca/probe`.

## Capabilities

### New Capabilities

- `onboarding-wizard`: estado de onboarding, endpoint de status, guard 428 y flujo del wizard.

### Modified Capabilities

<!-- Ninguna: system-config no tiene spec principal en openspec/specs/. -->

## Impact

- Backend: `modules/config` (servicio/endpoint de onboarding), guard global sobre controllers operativos, migración de backfill.
- Frontend: nueva feature `onboarding`, redirección en `router.tsx`.
- Sin dependencias nuevas. Sin cambios en la emisión fiscal ni en secretos.

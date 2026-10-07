# Proposal

## Why

Un usuario nuevo cae en el Inicio sin saber qué datos maestros necesita cargar antes de vender o facturar (datos fiscales, usuarios, categorías y unidades, productos, clientes y proveedores, tesorería, stock). Hoy no hay guía ni forma de saber qué falta. Issue #239.

Un wizard bloqueante (versión previa de este change) obliga y arriesga frenar instalaciones ya en uso. Se adopta un enfoque no bloqueante: una guía persistente cuyo progreso se calcula de los datos reales.

## What Changes

- Bloque **Primeros pasos** en el Inicio (Dashboard), visible para administradores. Una fila por paso con su estado (hecho/pendiente) y enlace a la pantalla existente del módulo. No bloquea ninguna operación.
- Pasos: Empresa y fiscal, Usuarios, Categorías y unidades, Productos, Clientes y proveedores, Tesorería, Stock.
- El progreso se **calcula** con consultas de existencia sobre datos que ya existen; no se guarda ningún estado de pasos. Sin tabla nueva y sin migración.
- El bloque se puede **descartar** y no vuelve; cuando todos los pasos están hechos desaparece solo.
- **Carteles contextuales** en Productos, Compras y Ventas: aparecen una vez por pantalla, se pueden descartar y no vuelven.
- El descarte (del bloque y de cada cartel) se persiste en `system_settings` (puesto único: vale para todos los equipos y sobrevive reinicios).
- `GET /config/onboarding-status` (admin) devuelve pasos, descarte del bloque y carteles descartados. Dos `POST` registran los descartes.
- El certificado ARCA **no se sube**: el paso fiscal solo muestra si el cert del entorno está configurado (`/arca/probe`).
- **Se retira** del trabajo previo: guard 428 (`OnboardingGuard`, `AllowDuringOnboarding`), redirección forzada al wizard, `onboarding_completed`, omitir/finalizar pasos y la migración de backfill.

## Capabilities

### New Capabilities

- `onboarding-wizard`: guía de primeros pasos calculada, descarte persistido y carteles contextuales.

### Modified Capabilities

<!-- Ninguna: no hay spec principal que cambie. -->

## Impact

- Backend: `modules/onboarding` (servicio de estado y descartes, controller); se quitan guard, migración 037 y su uso en controllers operativos.
- Frontend: bloque en el Dashboard, componente de cartel reutilizable en Productos/Compras/Ventas; se quita la ruta `/onboarding` y la redirección.
- Sin dependencias nuevas. No cambia emisión fiscal ni secretos.

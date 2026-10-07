# Design

## Context

- `system_settings(key PK, value text)` ya existe (migración 033) y es el almacén de parámetros del puesto único. Fila ausente = no definido.
- El certificado ARCA se carga solo desde env; `GET /arca/probe` (admin) informa su estado.
- El Dashboard (`/`) es la pantalla de entrada; tesorería siembra sus cuentas (migración 034).
- Referencia de enfoque: guía persistente cuyo progreso se calcula y no se guarda; descarte como preferencia.

## Goals / Non-Goals

**Goals**

- Guiar sin bloquear; progreso derivado de datos reales; descarte persistente.

**Non-Goals**

- Bloquear operaciones, subir el `.p12`, tabla de checklist, dependencias de tours.

## Decisions

1. **Progreso calculado** en `OnboardingService.getStatus()` con `SELECT EXISTS(...)` por paso (una consulta por paso, sin conteos ni consultas por entidad). Nada de estado de pasos persistido: no hay nada que sincronizar al cargar datos.
2. **Descarte en `system_settings`**: claves `onboarding_dismissed` y `hint_dismissed_<id>` (`products`, `purchases`, `sales`; ≤ 50 caracteres). Puesto único = una preferencia para todos los equipos. Alternativas descartadas: `localStorage` (reaparece en otra computadora) y columna por usuario (exige migración; no hay más de un puesto).
3. **API** (admin) en `modules/onboarding`: `GET /config/onboarding-status` → `{ steps: [{id, done}], dismissed, hintsDismissed }`; `POST /config/onboarding/dismiss`; `POST /config/hints/:id/dismiss` con validación de id contra lista cerrada.
4. **Sin bloqueo**: se eliminan `OnboardingGuard`, `AllowDuringOnboarding`, la redirección del router, `skip`/`complete`, `onboarding_completed` y la migración de backfill 037 (revertida localmente antes de borrarla).
5. **Frontend**: `features/onboarding` con `FirstStepsCard` (en `DashboardPage`, solo administradores, oculto si `dismissed` o todos hechos), `ContextHint` reutilizable (título, texto, botón "Entendido") y `useOnboardingStatusQuery`. Cada paso enlaza a la pantalla existente (`STEP_META`). Se reemplaza el wizard y su ruta; no quedan dos listas de pasos.
6. **Paso fiscal**: estado de `getEffective()` más el cert vía `/arca/probe`; se edita en Configuración.
7. **Carteles**: Productos, Compras y Ventas muestran `ContextHint` arriba si el id no está en `hintsDismissed`; sin librería de tour.

## Risks / Trade-offs

- Siete pasos "hechos" para que desaparezca solo es exigente (stock, clientes): el descarte manual lo compensa.
- Una consulta de estado al abrir el Inicio: son siete `EXISTS`, indexados por PK/primera fila.
- Descarte global al puesto: un administrador lo descarta para todos (aceptado, puesto único).

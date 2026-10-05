# Proposal

## Why

US-33 (issue #11): el administrador necesita abrir la caja con un saldo inicial, ver los movimientos de efectivo del turno y cerrarla con un arqueo que compare lo esperado con lo contado. Hoy el libro de tesorería (change `treasury-ledger`) registra los movimientos de efectivo pero no hay turno ni control de diferencias.

## What Changes

- Tabla `cash_registers`: un turno por fila (apertura, saldo inicial, cierre, saldo esperado, saldo contado, diferencia, observación). Un índice único parcial garantiza una sola caja abierta a la vez.
- `POST /cash-register/open` (`openingBalance`), `POST /cash-register/close` (`actualBalance`, `observation`) y `GET /cash-register/current` (estado, saldo esperado, movimientos del turno y último cierre). Solo ADMINISTRADOR.
- Saldo esperado = saldo inicial + ingresos − egresos de la cuenta `EFECTIVO` desde la apertura. Los movimientos del turno son los de `EFECTIVO` desde `openedAt` (incluye los manuales ya existentes).
- Al cerrar con diferencia distinta de 0 la observación es obligatoria y el sistema registra un movimiento de ajuste en `EFECTIVO` por la diferencia, para que el libro coincida con el efectivo contado. El cierre queda en el log de auditoría.
- Frontend `/treasury/cash-register` (wireframe 31): caja cerrada con formulario de apertura, caja abierta con movimientos y arqueo con diferencia calculada en vivo.
- Fuera de alcance: varias cajas simultáneas, arqueo por denominación, reapertura de un turno cerrado, cierre bloqueado por movimientos concurrentes.

## Capabilities

### New Capabilities

- `treasury/cash-register`: apertura, movimientos del turno y cierre con arqueo.

### Modified Capabilities

(ninguna)

## Impact

- Backend: módulo `cash-register` (entidad, servicio, controller) que usa `TreasuryService`; migración `1700000000035-*`.
- Shared types: `ICashRegisterState` y payloads.
- Frontend: `features/cash-register/`, página `/treasury/cash-register`, ruta y permiso.
- Zona sensible: no toca ARCA ni numeración fiscal.

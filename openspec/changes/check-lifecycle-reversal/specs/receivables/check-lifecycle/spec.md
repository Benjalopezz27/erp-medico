# Spec Delta

## Purpose

Seguir cada cheque recibido por su ciclo de vida y evitar transiciones inválidas.

## ADDED Requirements

### Requirement: Transiciones de estado

El sistema SHALL exponer, solo para ADMINISTRADOR, `PATCH /checks/:id/to-cartera` (RECIBIDO → EN_CARTERA), `PATCH /checks/:id/deposit` (EN_CARTERA → DEPOSITADO) y `PATCH /checks/:id/endorse` (EN_CARTERA → ENDOSADO, con `supplierId` de un proveedor existente). Cada transición MUST bloquear la fila del cheque, validar el estado actual y registrar auditoría. Una transición desde otro estado SHALL dar 409 (`CHECK_INVALID_TRANSITION`) sin cambios.

#### Scenario: Flujo feliz

- **WHEN** un cheque RECIBIDO pasa a cartera y luego se deposita
- **THEN** su estado es `EN_CARTERA` y después `DEPOSITADO`

#### Scenario: Endoso

- **WHEN** un cheque EN_CARTERA se endosa a un proveedor existente
- **THEN** su estado es `ENDOSADO` y guarda `endorsedToSupplierId`

#### Scenario: Endoso a proveedor inexistente

- **WHEN** el `supplierId` no existe
- **THEN** la respuesta es 404 y el cheque no cambia

#### Scenario: Transición inválida

- **WHEN** se intenta pasar un cheque DEPOSITADO a cartera
- **THEN** la respuesta es 409 `CHECK_INVALID_TRANSITION` y el estado no cambia

#### Scenario: Transiciones concurrentes

- **WHEN** dos pedidos depositan y endosan el mismo cheque EN_CARTERA a la vez
- **THEN** uno se aplica y el otro recibe 409

### Requirement: Listado y detalle

`GET /checks` SHALL listar cheques paginados con filtros por `status` y rango de `dueDate`, ordenados por vencimiento, e incluir el contador `dueSoonCount` de cheques EN_CARTERA o RECIBIDO con vencimiento dentro de los próximos 7 días. `GET /checks/:id` SHALL devolver el cheque con cliente, cobro y, si está EN_CARTERA o DEPOSITADO, el impacto previsto del rechazo. Ambos MUST requerir ADMINISTRADOR.

#### Scenario: Filtro por estado

- **WHEN** se lista con `status = EN_CARTERA`
- **THEN** solo aparecen cheques en ese estado

#### Scenario: Cheques por vencer

- **WHEN** hay un cheque EN_CARTERA que vence en 3 días
- **THEN** `dueSoonCount` lo cuenta

#### Scenario: Sin permiso

- **WHEN** un VENDEDOR consulta `/checks`
- **THEN** la respuesta es 403

## ADDED Requirements

### Requirement: Estado de onboarding persistido

El sistema SHALL persistir `onboarding_completed` y el avance por paso en `system_settings`. Ausencia de la clave MUST interpretarse como `false`.

#### Scenario: Reinicio a mitad de carga

- **WHEN** el servidor se reinicia con los pasos 1 y 2 completos
- **THEN** `GET /config/onboarding-status` informa esos pasos como completos y el resto como pendientes

### Requirement: Consulta de estado

`GET /config/onboarding-status` SHALL devolver `completed`, la lista de pasos con su estado (`done`, `skipped`, `pending`), si cada uno es obligatorio y el primer paso pendiente. Solo rol administrador.

#### Scenario: Sistema nuevo

- **WHEN** un administrador consulta con la base recién creada
- **THEN** `completed` es `false` y el primer paso pendiente es "Empresa y fiscal"

### Requirement: Completitud mínima por paso

El sistema SHALL marcar un paso como `done` solo si el módulo correspondiente tiene el mínimo cargado (fiscal: razón social, CUIT, condición y punto de venta; usuarios: al menos un administrador activo; categorías y unidades: al menos una de cada; tesorería: saldo inicial cargado). Los pasos productos, clientes/proveedores, tesorería (saldo cero) y stock MAY marcarse `skipped`.

#### Scenario: Avanzar sin mínimo

- **WHEN** se intenta completar el paso de categorías sin ninguna unidad cargada
- **THEN** el sistema rechaza el avance e informa qué falta

#### Scenario: Omitir paso opcional

- **WHEN** el usuario omite "Productos, precios y costos"
- **THEN** el paso queda `skipped` y el paso de stock inicial se considera omitido

### Requirement: Finalización

El sistema SHALL poner `onboarding_completed = true` solo cuando todos los pasos obligatorios estén `done` y los opcionales `done` o `skipped`.

#### Scenario: Finalizar con pendientes

- **WHEN** se solicita finalizar con un paso obligatorio pendiente
- **THEN** responde error y `onboarding_completed` sigue en `false`

### Requirement: Bloqueo operativo 428

Mientras `onboarding_completed = false`, el backend MUST responder `428 Precondition Required` con el paso pendiente en endpoints operativos (ventas, stock, facturación, pagos). Los endpoints de auth, config, y los de cada módulo usados por el wizard MUST seguir accesibles.

#### Scenario: Venta sin onboarding

- **WHEN** se llama `POST /sales` con onboarding incompleto
- **THEN** responde 428 e incluye el paso pendiente

#### Scenario: Paso del wizard

- **WHEN** el wizard llama `POST /categories` con onboarding incompleto
- **THEN** la operación se procesa normalmente

### Requirement: Backfill de instalaciones existentes

La migración SHALL marcar `onboarding_completed = true` si ya existen usuarios y (productos o ventas). En una base vacía MUST NOT escribir la clave.

#### Scenario: Producción con datos

- **WHEN** corre la migración sobre una base con usuarios y ventas
- **THEN** el guard 428 no bloquea ninguna operación

### Requirement: Certificado ARCA solo verificado

El paso fiscal SHALL verificar el certificado configurado por entorno vía `IArcaService` y MUST NOT recibir, almacenar ni registrar en logs el `.p12` ni su password.

#### Scenario: Cert no configurado

- **WHEN** el entorno no define certificado
- **THEN** el paso muestra el estado del certificado como no disponible y no permite subirlo

### Requirement: Wizard reentrante y bloqueante

El frontend SHALL redirigir al paso pendiente a todo usuario administrador mientras `completed = false`, sin repetir pasos ya cargados.

#### Scenario: Reapertura

- **WHEN** el administrador vuelve a entrar con el paso 3 pendiente
- **THEN** el wizard abre en el paso 3

## ADDED Requirements

### Requirement: Single production environment

El sistema SHALL operar en un único entorno Railway llamado `production`; el repositorio MUST NOT definir ni referenciar un entorno `staging` como destino de deploy, verificación o configuración.

#### Scenario: No staging deploy target

- **WHEN** se inspeccionan los workflows de `.github/workflows/`
- **THEN** ningún workflow usa el environment `staging` ni un archivo/script cuyo nombre contenga `staging`

#### Scenario: Docs describe single environment

- **WHEN** se lee `AGENTS.md`, `docs/git_workflow.md` y `docs/RUNBOOK.md`
- **THEN** describen la cadena `dev → main` y un único entorno `production`, sin la cadena `dev → staging → main`

### Requirement: Deploy only from main with manual approval

El workflow `Deploy Railway` SHALL ejecutarse solo con push a `main`, usar el GitHub Environment `production` y requerir aprobación manual antes de desplegar; un push a `dev` MUST NOT desplegar.

#### Scenario: Push to dev

- **WHEN** se hace push a `dev`
- **THEN** el workflow de deploy no se dispara

#### Scenario: Push to main

- **WHEN** se hace push a `main` y CI pasa
- **THEN** el job de deploy usa el environment `production`, espera aprobación y despliega backend, worker y frontend en ese orden con el SHA empujado

#### Scenario: CI failure blocks deploy

- **WHEN** CI falla sobre el commit de `main`
- **THEN** no se despliega ningún servicio

### Requirement: Production verification workflow

La verificación externa SHALL ejecutarse con el workflow `Verify Railway Production` (manual) contra la URL HTTPS final y un SHA esperado, usando `scripts/smoke-test-production.sh`.

#### Scenario: Smoke with SHA

- **WHEN** se ejecuta el workflow con una URL HTTPS sin path y un SHA hexadecimal de 7 a 40 caracteres
- **THEN** corre la suite de smoke y falla si el SHA de backend o frontend no coincide

#### Scenario: Invalid input

- **WHEN** la URL no es un origen HTTPS o el SHA no es hexadecimal
- **THEN** el workflow falla antes de ejecutar la suite

### Requirement: Backup before every deploy

La documentación operativa SHALL exigir un backup restaurable de PostgreSQL inmediatamente antes de cada deploy que incluya migraciones, y MUST indicar que las migraciones se prueban en local o en un entorno efímero antes de llegar a `main`.

#### Scenario: Runbook gate

- **WHEN** se lee el runbook de operaciones Railway
- **THEN** el paso de backup previo precede al paso de deploy y referencia el runbook de backup/restore

### Requirement: Documented rollback

La documentación SHALL describir el rollback de aplicación (redeploy del SHA anterior) y de datos (restore desde el backup previo al cutover), con criterios objetivos y tiempo objetivo registrados como gate.

#### Scenario: Rollback procedure present

- **WHEN** se lee `docs/deployment/go-live-checklist.md`
- **THEN** contiene pasos de rollback de aplicación y de datos, y un campo de criterio y ventana de rollback pendiente de aprobación

### Requirement: Go-Live checklist with external gates

El repositorio SHALL incluir `docs/deployment/go-live-checklist.md` con los gates externos vigentes de #71 (ventana de Go-Live y rollback, responsables presentes, certificado ARCA productivo con CUIT y punto de venta, almacenamiento de backups, SMTP, datos iniciales y autorización, criterios de éxito/rollback, plan de comunicación, aceptación del cliente), cada uno con estado, responsable y fecha, y la secuencia de cutover del entorno único. Los secretos MUST NOT documentarse.

#### Scenario: Gates tracked

- **WHEN** se abre el checklist
- **THEN** cada gate figura con estado `PENDIENTE` hasta aprobación explícita y no contiene valores de secretos

#### Scenario: Cutover sequence

- **WHEN** se lee la secuencia de cutover
- **THEN** exige verificar vacío el `production` anterior antes de borrarlo, backup restaurable de `staging` antes de renombrarlo, y smoke tests en la URL final

# Proposal

## Why

Hoy no existe ningún backup del ERP: ni `pg_dump`, ni almacenamiento externo, ni procedimiento de restore (`grep` de backup/restore en `docs/`, `scripts/` y `.github/` solo encuentra menciones de planificación). Las ventas, el ledger de cobranzas y los comprobantes fiscales viven únicamente en el PostgreSQL de Railway. Un backup que nunca se restauró no cuenta como backup. La issue #70 (DEVOPS-05, hija de #65, dependencia de #71 Go-Live) debe cerrarse antes del Go-Live de Sprint 10; #68 (observabilidad) ya está cerrada.

## What Changes

Alcance acordado con el owner: **solo lado repo**. Los gates externos de la issue (proveedor, región, cifrado/custodia, retención, RPO/RTO, responsables, clasificación legal, ventana) no están resueltos: el código es agnóstico de proveedor y **nada se conecta a un storage externo ni toca Railway/producción** desde este cambio.

- Imagen/servicio `ops/backup`: scripts POSIX para `pg_dump` (formato custom, consistente por snapshot), checksum SHA-256, cifrado simétrico AES-256 con integridad, subida a storage S3-compatible configurable por variables de entorno.
- Retención GFS (por defecto 7 diarios, 4 semanales, 6 mensuales; parametrizable) con prefijo aparte para backups previos a migración.
- Alertas por protocolo de heartbeat (start/success/fail a una URL configurable) más verificación de antigüedad del último backup.
- Guardas: negarse a subir sin aprobación explícita del destino (`BACKUP_DESTINATION_APPROVED=true`), negarse a restaurar sobre la base de origen, y nunca loguear secretos.
- `restore` a una base temporal aislada (contenedor `postgres:16` sin puertos publicados), validación funcional mínima por SQL y reporte JSON con tiempos para medir RPO/RTO.
- Ensayo **local** de deploy → smoke → rollback de imagen con `docker-compose.prod.yml` y una migración, con datos sintéticos; procedimiento para el ensayo en staging ejecutado por una persona.
- Documentación: registro de gates con estado, runbook de backup/restore, plantilla de evidencia RPO/RTO y rehearsal, checklist de capacidad/seguridad/contingencia, actualización de `docs/RUNBOOK.md`.
- Sin dependencias nuevas en el monorepo. Sin migraciones. Sin cambios de UI.

**Fuera de alcance:** snapshot del VPS como único backup; declarar válido un backup sin restaurarlo; restaurar sobre producción; activar backups contra datos reales o storage externo (bloqueado por gates); ejecutar el ensayo en staging/producción (lo ejecuta una persona, AGENTS §6); modificar `ci.yml`/`publish-images.yml` (requiere aprobación del owner, AGENTS §7).

## Capabilities

### New Capabilities

- `operations/backup-automation`: dump cifrado, subida externa, retención GFS, alertas y guardas de destino.
- `operations/restore-verification`: restore aislado, validación funcional mínima y medición de RPO/RTO.
- `operations/release-rehearsal`: ensayo de deploy con migración, smoke y rollback de imagen, con evidencia.

### Modified Capabilities

(ninguna — `openspec/specs/` sigue sin capacidades operativas)

## Impact

- Nuevo: `ops/backup/` (scripts, Dockerfile, tests), `docs/deployment/backup-restore-runbook.md`, `docs/deployment/backup-gates.md`, `docs/deployment/evidence/`.
- Modificado: `docs/RUNBOOK.md` (enlaces y §backups), `docs/deployment/railway-operations-runbook.md` (backup previo a migración riesgosa), `.env.*.example` no cambian salvo un `ops/backup/.env.example` nuevo.
- Sistemas: ninguno externo tocado. Desbloquea #71 cuando los gates se aprueben y una persona active el servicio en Railway.
- Zonas sensibles (AGENTS §8): migraciones y datos reales — el cambio solo lee datos vía `pg_dump` y nunca corre migraciones fuera de local.

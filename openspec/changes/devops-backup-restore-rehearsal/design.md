# Design

## Context

- Staging corre en Railway (PostgreSQL managed privado, backend/worker/frontend como servicios). Producción aún no está decidida entre Railway y `docker-compose.prod.yml` (VPS). La issue habla de VPS; los docs de Railway dicen "zero public exposure" para PG. Por eso los scripts usan `DB_*`/`DATABASE_URL` genéricos y deben ejecutarse **dentro de la red privada** (servicio cron en Railway o profile de compose), no desde GitHub Actions.
- Ya existen: migración controlada como paso previo (`run-migrations.js`), `health/ready`, `scripts/smoke-test-staging.sh`, imágenes por SHA en GHCR, rollback de deploy documentado en `railway-operations-runbook.md` §6 (no deshace migraciones).
- Restricciones de AGENTS.md: sin secretos/infra/producción, sin dependencias nuevas en el monorepo, sin migraciones contra staging/prod, sin datos reales. Modificar CI requiere aprobación del owner.
- Host de desarrollo sin `pg_dump`/`psql`; sí Docker. Todo se prueba con contenedores `postgres:16` y un S3 local (MinIO) efímeros.

## Goals / Non-Goals

**Goals:** backup reproducible y probado en local extremo a extremo (dump → cifrado → subida → retención → descarga → restore → validación), agnóstico de proveedor, con fallos ruidosos.

**Non-Goals:** elegir proveedor, PITR/WAL archiving (RPO será el intervalo del dump diario; PITR queda como opción documentada si el cliente exige RPO menor), activar el servicio en Railway, cambiar CI.

## Decisions

1. **`pg_dump -Fc` lógico, no snapshot de volumen.** Consistente por transacción, portable entre Railway y compose, restaurable selectivamente. Alternativa: snapshot VPS (descartada por la issue); WAL/PITR (costo operativo alto para un puesto único).
2. **Cifrado con `gpg --symmetric --cipher-algo AES256` + passphrase desde archivo/variable.** Incluye MDC (detecta alteración); ya está en imágenes Alpine/Debian. Alternativas: `age` (dependencia extra), `openssl enc` (sin autenticación). La política de custodia de la clave es un gate; el script solo consume `BACKUP_ENCRYPTION_PASSPHRASE`.
3. **Storage vía API S3-compatible con `aws-cli` dentro de la imagen de backup** (`--endpoint-url` configurable): cubre S3, R2, B2, Wasabi, MinIO sin acoplar proveedor. Alternativa: `rclone` (más proveedores, más superficie).
4. **Imagen propia `ops/backup/Dockerfile`** (Alpine + `postgresql16-client` + `gnupg` + `aws-cli` + scripts), ejecutada como servicio cron de Railway o `profile: backup` de compose. No entra a `publish-images.yml` en este cambio (aprobación del owner); se construye a mano o se habilita luego.
5. **Retención GFS calculada localmente sobre el listado del bucket** por función pura (`retention.sh` recibe nombres por stdin y emite los que se borran) → testeable sin red. Un objeto se conserva si es de los N diarios, o primer backup de una de las últimas N semanas ISO, o primero de uno de los últimos N meses. `pre-migration/` tiene su propio prefijo y `KEEP_PRE_MIGRATION=5`.
6. **Alertas por heartbeat genérico** (`BACKUP_HEARTBEAT_URL` + `/start`, `/fail`): compatible con healthchecks.io o auto-hospedado; la falta de señal de éxito dentro del período dispara alerta (dead-man's switch), lo que cubre "backup antiguo" aun si el job no corre. `check-age.sh` agrega verificación directa contra el bucket.
7. **Restore aislado con `docker run postgres:16` sin `-p` y red efímera**, usando `pg_restore` dentro del contenedor. Guarda dura: abortar si el destino coincide con `DB_HOST`/`DB_NAME` de origen. Alternativa: restaurar en una DB secundaria del mismo servidor (descartada: "no restaurar sobre producción").
8. **Validación funcional por SQL versionado** (`verify-restore.sql`): conteo de migraciones aplicadas igual al de los archivos de `apps/backend/src/database/migrations`, tablas críticas legibles, stock no negativo e invariantes del ledger (saldo de factura = monto original − aplicaciones + reversiones). Las invariantes exactas se derivan de las migraciones `receivables`/`payments`/`checks` al implementar; sin float (`decimal_policy`: se usa `numeric` en SQL).
9. **RPO/RTO**: RPO teórico = intervalo de backup (default 24 h) + duración de dump; RTO medido = descarga + descifrado + restore + validación (+ tiempo humano estimado en el runbook). El reporte JSON los registra; "aceptados" depende del gate del cliente.
10. **Ensayo de release local** con `docker-compose.prod.yml`: imágenes construidas localmente de dos commits (A = `dev`, B = `dev` + migración de prueba descartable en una rama temporal que **no se commitea**), migración → smoke → rollback a A. Deja evidencia en `docs/deployment/evidence/`. El equivalente en staging es un procedimiento documentado ejecutado por una persona.

## Risks / Trade-offs

- [Pérdida de la passphrase = backups inservibles] → runbook exige custodia doble (gate) y prueba de restore en cada rotación de clave.
- [Dump lógico crece y bloquea menos pero tarda] → medir tamaño/tiempo en el ensayo; umbral de capacidad en checklist.
- [`gpg` simétrico con passphrase, no clave pública] → aceptable para un puesto único; alternativa `age`/clave pública queda como mejora si el gate de custodia la pide.
- [Retención borra por error] → función pura con tests, modo `--dry-run` por defecto en la primera activación, y nunca corre si la subida actual falló.
- [MinIO local no equivale al proveedor real] → la activación real repite el test de credenciales/red contra el proveedor aprobado como paso humano de la checklist.
- [Datos reales en pruebas] → todo con datos sintéticos; prohibido usar dump de staging/prod en local.

## Migration Plan

Sin cambios de esquema. Activación (fuera de este cambio, humana): aprobar gates → crear bucket y credenciales → cargar variables como sealed en Railway → desplegar servicio cron → correr primer backup + restore drill → registrar evidencia → habilitar alertas. Rollback: desactivar el cron; los scripts no modifican la base.

## Open Questions

- Dónde se ejecuta el cron en producción (Railway cron service vs host VPS) depende del gate de infraestructura de #66/#71; los scripts sirven para ambos.
- Si `publish-images.yml` debe publicar la imagen de backup: se difiere a un PR aprobado por el owner.

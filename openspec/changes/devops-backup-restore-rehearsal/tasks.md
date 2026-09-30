# Tasks

## 1. Rama, gates y andamiaje

- [x] 1.1 Crear `docs/deployment/backup-gates.md` con los 8 gates de la issue (proveedor/costo, región, cifrado/custodia, retención, RPO/RTO, responsables, clasificación legal, ventana) cada uno con estado `PENDIENTE`, dueño y fecha; verificar que el archivo lista los 8 y que el runbook lo enlaza.
- [x] 1.2 Crear `ops/backup/` con `.env.example` (solo nombres de variables, sin valores), `README` mínimo y script `lib.sh` (logging sin secretos, `require_env`, redacción). Verificar con `shellcheck` (vía contenedor) y prueba que imprime `[REDACTED]` ante una variable de passphrase.

## 2. Backup y cifrado

- [x] 2.1 Test que falla primero (`ops/backup/test/backup.test.sh`, usa contenedores `postgres:16` y MinIO efímeros con datos sintéticos): backup exitoso sube `.dump.gpg` + `.sha256`, el objeto no contiene texto plano, `pg_dump` fallido/archivo vacío no sube y sale ≠ 0, `BACKUP_DESTINATION_APPROVED` ausente aborta sin llamadas de red. Verificar que falla antes de implementar.
- [x] 2.2 Implementar `backup.sh` (pg_dump -Fc, verificación de tamaño > 0, sha256, gpg AES256, subida con `aws s3 cp --endpoint-url`, etiqueta `--label pre-migration`). Verificar que pasa 2.1.
- [x] 2.3 Extender test e implementar fallos de red y credenciales inválidas: salida ≠ 0, señal de fallo emitida, ningún secreto en stdout/stderr. Verificar con el test.

## 3. Retención y alertas

- [x] 3.1 Test que falla primero de `retention.sh` como función pura (40 diarios consecutivos → 7 d + 4 s + 6 m sin duplicar; `pre-migration/` conserva 5; lista vacía o un solo objeto no borra nada). Verificar que falla antes.
- [x] 3.2 Implementar `retention.sh` (stdin → nombres a borrar, `--dry-run` por defecto, aplicación real con `aws s3 rm`) y llamarla desde `backup.sh` solo tras subida exitosa. Verificar que pasa 3.1 y que con subida fallida no se ejecuta.
- [x] 3.3 Test y implementación de heartbeat (`/start`, éxito, `/fail`) y `check-age.sh` (`BACKUP_MAX_AGE_HOURS`). Verificar con un receptor HTTP local que recibe las tres señales y que un backup viejo da ≠ 0.
- [x] 3.4 Crear `ops/backup/Dockerfile` (Alpine + postgresql16-client + gnupg + aws-cli, usuario no-root, digest fijado como en `docker-compose.prod.yml`). Verificar `docker build` local y que el contenedor ejecuta el test 2.1.

## 4. Restore aislado y validación

- [x] 4.1 Test que falla primero (`restore.test.sh`): checksum alterado aborta, descifrado con clave incorrecta aborta, destino igual al origen aborta, restore sano crea base temporal sin puertos publicados y la destruye. Verificar que falla antes.
- [x] 4.2 Implementar `restore.sh` (descarga por nombre o `--latest`, verifica sha256, descifra, levanta `postgres:16` efímero sin `-p`, `pg_restore`, limpieza con trap, reporte JSON de tiempos y edad del backup). Verificar que pasa 4.1 y que restaura una copia anterior.
- [x] 4.3 Leer las migraciones `receivables`, `payments` y `checks` y escribir `verify-restore.sql` (migraciones aplicadas = archivos, tablas críticas legibles, stock ≥ 0, invariantes del ledger en `numeric`). Test que falla primero: una base con un saldo corrompido a mano hace fallar el chequeo; una base sana pasa. Verificar ambos casos.
- [x] 4.4 Integrar `verify-restore.sql` en `restore.sh` y agregar `pnpm test:ops` (script raíz que corre los tests de `ops/backup/test` en Docker). Verificar `pnpm test:ops` verde y que `pnpm test` existente no cambia.

## 5. Ensayo de release local

- [x] 5.1 Escribir `ops/backup/rehearsal-local.sh` o procedimiento equivalente en el runbook: construir imágenes A (`dev`) y B (con migración de prueba descartable no commiteada), `docker-compose.prod.yml` con datos sintéticos, migración, `smoke` de health/ready, rollback a A. Verificar ejecutándolo y registrando tiempos.
- [x] 5.2 Caso de migración fallida: B no arranca y A sigue sirviendo. Verificar con `health/ready` de A durante el fallo.
- [x] 5.3 Crear plantilla `docs/deployment/evidence/_template.md` y completar `docs/deployment/evidence/local-rehearsal-<fecha>.md` con SHAs, tiempos de backup/restore/RTO medido, resultado del rollback y observaciones (sin secretos ni datos reales). Verificar que no contiene credenciales (`gitleaks`/secret-scan local).

## 6. Documentación y runbooks

- [x] 6.1 Escribir `docs/deployment/backup-restore-runbook.md`: arquitectura, variables, activación humana paso a paso, restore paso a paso, backup previo a migración riesgosa, rotación de clave, RPO/RTO medido, pruebas de falla. Verificar revisión cruzada contra los escenarios de los tres specs.
- [x] 6.2 Agregar checklist de capacidad, seguridad y contingencia (en el mismo runbook o `docs/deployment/go-live-readiness.md`) y el procedimiento de ensayo en staging ejecutado por una persona (deploy, smoke con `verify-staging.yml`, rollback Railway). Verificar que cada ítem tiene dueño y criterio observable.
- [x] 6.3 Actualizar `docs/RUNBOOK.md` (sección backups/restore, enlaces) y `railway-operations-runbook.md` §5–6 (backup previo a migración riesgosa, recordatorio de que el rollback no deshace migraciones). Verificar enlaces relativos con `grep` y `pnpm run format:check`.

## 7. Verificación final

- [ ] 7.1 Correr `pnpm run format:check && pnpm -r run lint && pnpm test && pnpm build && pnpm test:ops`; todos verdes.
- [x] 7.2 Smoke con claude-in-chrome: restaurar un backup sintético en Postgres temporal, levantar backend/frontend locales apuntando a esa base y verificar en el navegador login, productos, ventas y `/treasury/checks` con los datos restaurados; capturar resultado en la evidencia. Verificar sin errores de consola ni 5xx.
- [ ] 7.3 Actualizar el estado de DoD de la issue en la evidencia: marcar pendiente lo bloqueado por gates (backup externo real, RPO/RTO aceptados, rehearsal en staging) sin cerrarlo. Commits atómicos por tarea, sin push.

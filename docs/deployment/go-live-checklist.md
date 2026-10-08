# Go-Live — gates y cutover del entorno único (#71, #283)

> Railway opera un único entorno, `production` (decisión #283). No hay entorno previo al deploy:
> las migraciones corren contra datos reales. Nada de lo siguiente se ejecuta hasta que todos los
> gates figuren como **APROBADO**. Los secretos nunca se documentan acá ni en las issues.

## 1. Gates externos (#71)

| #   | Gate                                                              | Estado    | Responsable | Fecha | Decisión / referencia |
| --- | ----------------------------------------------------------------- | --------- | ----------- | ----- | --------------------- |
| 1   | Plan de Railway, presupuesto mensual y responsable de facturación | PENDIENTE |             |       |                       |
| 2   | Dominio y acceso DNS (o uso del dominio Railway)                  | PENDIENTE |             |       |                       |
| 3   | Ventana de Go-Live y ventana de rollback                          | PENDIENTE |             |       |                       |
| 4   | Responsable técnico y representante del cliente presentes         | PENDIENTE |             |       |                       |
| 5   | Certificado ARCA productivo, CUIT y punto de venta confirmados    | PENDIENTE |             |       |                       |
| 6   | Almacenamiento de backups operativo (gates de `backup-gates.md`)  | PENDIENTE |             |       |                       |
| 7   | SMTP productivo, si se habilitan notificaciones                   | PENDIENTE |             |       |                       |
| 8   | Datos iniciales y autorización para cargarlos                     | PENDIENTE |             |       |                       |
| 9   | Criterios objetivos de éxito y de rollback (sección 3)            | PENDIENTE |             |       |                       |
| 10  | Plan de comunicación ante incidentes                              | PENDIENTE |             |       |                       |
| 11  | Aceptación del cliente para poner el sistema en producción        | PENDIENTE |             |       |                       |

Estados: `PENDIENTE` · `APROBADO` · `RECHAZADO`. Cada aprobación referencia un comentario en #71.

## 2. Cutover del entorno único (ejecuta una persona)

Los agentes no ejecutan estos pasos (AGENTS §6 y §8).

**Antes de borrar nada**

- [ ] Backup de Postgres del `staging` actual, con restore verificado ([runbook de backup](backup-restore-runbook.md) §4). Evidencia en `evidence/`.
- [ ] El `production` actual (Postgres, Redis, volúmenes) verificado **vacío**. Si tiene datos reales, migrarlos antes.
- [ ] El cambio `railway-single-env-production` mergeado a `dev` y promovido a `main`.

**Infra**

- [ ] Borrar el entorno `production` anterior (irreversible: borra Postgres, Redis y volúmenes).
- [ ] Renombrar `staging` a `production` (Project Settings → Environments).
- [ ] Auto-deploy de GitHub desactivado en `backend`, `worker` y `frontend`; rama de deploy `main`.
- [ ] Project token del entorno resultante guardado como `RAILWAY_TOKEN` en el GitHub Environment `production`, con required reviewers activos. Eliminar el GitHub Environment `staging`.
- [ ] Variables revisadas: `NODE_ENV`, URLs, CORS, secrets nuevos (no reutilizar los de desarrollo), `ARCA_ENV`.
- [ ] Certificado ARCA productivo cargado como variable sellada (`ARCA_CERT_BASE64`, `ARCA_CERT_PASSWORD`); nunca en Git ni logs.
- [ ] Dominios y TLS movidos al entorno resultante; HTTPS y redirecciones verificados.
- [ ] Postgres y Redis sin dominio público ni TCP proxy.
- [ ] Alertas y responsables activos ([runbook de operaciones](railway-operations-runbook.md) §9).

## 3. Criterios de éxito y rollback (a aprobar en el gate 9)

| Criterio                                       | Valor acordado |
| ---------------------------------------------- | -------------- |
| Smoke test verde (`Verify Railway Production`) | PENDIENTE      |
| Prueba fiscal acordada con el cliente aprobada | PENDIENTE      |
| Tiempo máximo de rollback de aplicación        | PENDIENTE      |
| Tiempo máximo de restore de datos (RTO)        | PENDIENTE      |
| Condiciones que obligan a hacer rollback       | PENDIENTE      |

## 4. Go-Live

1. Backup fresco inmediato (`ops/backup/backup.sh --label pre-migration`) y restore verificado.
2. Promover `dev → main` con `/asome-deploy main`; aprobar el deploy en el GitHub Environment `production`.
3. Confirmar migración de pre-deploy y healthchecks en Railway.
4. Ejecutar `Verify Railway Production` con la URL final y el SHA desplegado.
5. Smoke funcional en la URL final: login, venta, emisión fiscal, PDF y backorders.
6. Decidir continuar o hacer rollback según la sección 3.
7. Tag `v1.0.0` y release (`/asome-deploy`); registrar SHA, hora y resultado en #71.
8. Monitoreo intensivo posterior y handoff del runbook.

## 5. Rollback

**Aplicación** ([runbook de operaciones](railway-operations-runbook.md) §6): rollback de Railway al deployment previo, esperar healthcheck, correr `Verify Railway Production` contra el SHA anterior. Las migraciones deben ser expand-only: la imagen anterior sigue sirviendo sobre el esquema migrado.

**Datos**: solo si el rollback de aplicación no alcanza. Restaurar el backup previo al cutover en una base temporal ([backup-restore-runbook.md](backup-restore-runbook.md) §4), validar, y decidir con el responsable técnico y el cliente cómo promoverla. Nunca restaurar sobre la base en uso sin esa decisión.

## 6. Cierre

- [ ] Gates aprobados, smoke exitoso, aceptación del cliente.
- [ ] `v1.0.0` publicado, runbooks y handoff entregados.
- [ ] #283 y #71 cerradas, board en Done.

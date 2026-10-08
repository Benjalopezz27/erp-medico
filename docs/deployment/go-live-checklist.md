# Go-Live — gates y cutover del entorno único (#71, #283)

> Railway opera un único entorno, `production` (decisión #283). No hay entorno previo al deploy:
> las migraciones corren contra datos reales. Nada de lo siguiente se ejecuta hasta que todos los
> gates figuren como **APROBADO**. Los secretos nunca se documentan acá ni en las issues.

## 1. Gates externos (#71)

| #   | Gate                                                              | Estado    | Responsable | Fecha      | Decisión / referencia                                                |
| --- | ----------------------------------------------------------------- | --------- | ----------- | ---------- | -------------------------------------------------------------------- |
| 1   | Plan de Railway, presupuesto mensual y responsable de facturación | APROBADO  | Benjamin    | 2026-10-08 | Railway Hobby, paga el responsable técnico                           |
| 2   | Dominio y acceso DNS (o uso del dominio Railway)                  | APROBADO  | Benjamin    | 2026-10-08 | Dominio `app.distribuidoramedica.store`; falta confirmar acceso DNS  |
| 3   | Ventana de Go-Live y ventana de rollback                          | APROBADO  | Benjamin    | 2026-10-08 | Lunes 2026-10-12 (feriado), tarde; rollback 4 h; hora exacta a fijar |
| 4   | Responsable técnico y representante del cliente presentes         | PENDIENTE |             |            | Confirmar quién del cliente está presente                            |
| 5   | Certificado ARCA productivo, CUIT y punto de venta confirmados    | PENDIENTE | Benjamin    |            | Falta hablar con la contadora (2026-10-09)                           |
| 6   | Almacenamiento de backups operativo (gates de `backup-gates.md`)  | PENDIENTE |             |            | Ver sección 8: backup manual para el Go-Live                         |
| 7   | SMTP productivo, si se habilitan notificaciones                   | PENDIENTE |             |            | Confirmar si se habilitan mails (reset de contraseña)                |
| 8   | Datos iniciales y autorización para cargarlos                     | APROBADO  | Benjamin    | 2026-10-08 | Sin datos iniciales: el cliente carga todo                           |
| 9   | Criterios objetivos de éxito y de rollback (sección 3)            | APROBADO  | Benjamin    | 2026-10-08 | Sección 3, aprobados por el responsable técnico                      |
| 10  | Plan de comunicación ante incidentes                              | APROBADO  | Benjamin    | 2026-10-08 | Sección 7; canal: WhatsApp con el cliente                            |
| 11  | Aceptación del cliente para poner el sistema en producción        | PENDIENTE |             |            |                                                                      |

Estados: `PENDIENTE` · `APROBADO` · `RECHAZADO`. Cada aprobación referencia un comentario en #71.

## 2. Cutover del entorno único (ejecuta una persona)

Los agentes no ejecutan estos pasos (AGENTS §6 y §8).

**Antes de borrar nada**

- [x] Backup de Postgres del `staging` actual, con restore verificado (2026-10-08, ver `evidence/pre-cutover-backup-2026-10-08.md`; repetir antes del cutover) ([runbook de backup](backup-restore-runbook.md) §4). Evidencia en `evidence/`.
- [x] El `production` anterior estaba vacío y ya fue eliminado (2026-10-08; el proyecto solo tiene `staging`).
- [ ] El cambio `railway-single-env-production` mergeado a `dev` y promovido a `main`.

**Infra**

- [ ] Borrar el entorno `production` anterior (irreversible: borra Postgres, Redis y volúmenes).
- [ ] Renombrar `staging` a `production` (Project Settings → Environments).
- [ ] Auto-deploy de GitHub desactivado en `backend`, `worker` y `frontend`; rama de deploy `main`.
- [ ] Project token del entorno resultante guardado como `RAILWAY_TOKEN` en el GitHub Environment `production`, con required reviewers activos. Eliminar el GitHub Environment `staging`.
- [ ] Variables revisadas: `NODE_ENV`, URLs, CORS, secrets nuevos (no reutilizar los de desarrollo), `ARCA_ENV`.
- [ ] Certificado ARCA productivo cargado como variable sellada (`ARCA_CERT_BASE64`, `ARCA_CERT_PASSWORD`); nunca en Git ni logs.
- [ ] Dominio `app.distribuidoramedica.store` agregado al servicio `frontend` (Settings → Networking → Custom Domain, puerto 8080). Crear en el DNS el registro CNAME que Railway indica (más el TXT de verificación si lo pide) y esperar el certificado TLS.
- [ ] `CORS_ALLOWED_ORIGINS=https://app.distribuidoramedica.store` en el backend. Verificar HTTPS y la redirección HTTP→HTTPS.
- [ ] Postgres y Redis sin dominio público ni TCP proxy.
- [ ] Alertas y responsables activos ([runbook de operaciones](railway-operations-runbook.md) §9).

## 3. Criterios de éxito y rollback (aprobados 2026-10-08)

**Ventana:** lunes 2026-10-12 (feriado), por la tarde (hora exacta a confirmar). Ventana de rollback: 4 h desde el inicio del cutover.

**Éxito** (deben cumplirse todos para dar por cerrado el Go-Live):

- Backend, worker y frontend en `SUCCESS`; migración de pre-deploy sin error.
- `Verify Railway Production` verde con el SHA desplegado.
- `/api/v1/health/ready` responde 200 durante 30 min seguidos, sin errores 5xx en logs.
- Login, venta de prueba con descuento de stock, PDF y backorders funcionan en la URL final.
- Cola BullMQ procesa un job de prueba sin quedar en error.
- Prueba fiscal acordada con la contadora aprobada (pendiente de definir, ver gate 5).

**Rollback** (cualquiera obliga a decidir en el momento):

- La migración falla, o el smoke falla y no se corrige en 60 min.
- La emisión fiscal es rechazada por causa del sistema (no por datos del comprobante).
- Inconsistencia de datos (stock negativo, saldos que no cierran).
- Errores 5xx sostenidos por más de 15 min.
- Se llega a la hora 3 de la ventana sin criterios de éxito cumplidos: decisión final de continuar o volver atrás antes de la hora 4.

| Tiempo máximo                       | Valor aprobado |
| ----------------------------------- | -------------- |
| Rollback de aplicación              | 15 min         |
| Restore de datos (RTO)              | 1 h            |
| Decisión final continuar o rollback | hora 3 de 4    |

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

## 7. Plan de comunicación (aprobado 2026-10-08)

- **Contactos:** responsable técnico (Benjamin), representante del cliente y contadora (nombres y teléfonos a completar fuera del repo).
- **Canal:** WhatsApp con el cliente (la contadora se suma al grupo si el cliente lo acepta). Sin secretos ni datos fiscales reales en los mensajes.
- **Antes:** aviso al cliente 24 h antes con fecha, franja y qué esperar.
- **Durante:** mensaje al inicio, al terminar el deploy, al terminar los smoke tests y al decidir continuar o rollback.
- **Incidente:** aviso inmediato si se activa un criterio de rollback, con estado y hora estimada de resolución. Cada hora hasta resolver.
- **Después:** mensaje de cierre con el resultado; monitoreo intensivo los 3 días siguientes.

## 8. Backup para el Go-Live (sin plan Pro)

El backup no depende del plan de Railway: `pg_dump` corre del lado cliente. Para el Go-Live alcanza un dump manual, cifrado y copiado a dos lugares, hasta aprobar el destino automatizado de `backup-gates.md` (por ejemplo un bucket S3-compatible).

1. Habilitar temporalmente el TCP Proxy de Postgres en Railway (o usar `railway connect`) y deshabilitarlo al terminar.
2. `pg_dump -Fc --no-owner` desde tu máquina; verificar con `pg_restore --list`.
3. Restaurar en un Postgres local de prueba y revisar conteos de tablas críticas.
4. Cifrar el dump y guardarlo en dos lugares distintos. La clave no se guarda con el dump.
5. Registrar fecha, tamaño y resultado del restore en `evidence/`, sin datos reales.

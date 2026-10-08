# Evidence — backup drill — 2026-10-08

> Sin secretos, sin datos reales, sin URLs con tokens.

- **Entorno:** staging actual de Railway (será el entorno único `production`, #283)
- **Datos:** datos reales de la prueba de #265; el dump nunca se versiona
- **Responsable / ventana autorizada:** Benjamin (responsable técnico), manual, sin ventana de cliente
- **Servidor:** PostgreSQL 18.6. Cliente usado: imagen `postgres:18`
- **Método:** `pg_dump -Fc --no-owner` desde una máquina local vía TCP Proxy temporal, dado de baja al terminar (verificado por MCP de solo lectura: sin proxies)

## Pasos

| Paso                                  | Resultado | Observaciones                                                             |
| ------------------------------------- | --------- | ------------------------------------------------------------------------- |
| Dump con `postgres:16`                | falló     | `server version mismatch`: el servidor es 18.6                            |
| Dump con `postgres:18`                | ok        | archivo no vacío                                                          |
| `pg_restore` en Postgres 18 local     | ok        | 46 tablas restauradas                                                     |
| Conteo de filas de tablas críticas    | ok        | users 3, customers 2, products 3, sales 15, fiscal_documents 15, stocks 3 |
| Migraciones aplicadas vs. archivos    | ok        | 39 filas en `migrations`, 39 archivos en `database/migrations`            |
| Cifrado AES256 y copia en dos lugares | pendiente | confirmar por el responsable                                              |

## RPO / RTO observados

- RPO: punto de dump manual, 2026-10-08. Sin automatización todavía.
- RTO: restore local completado en minutos con datos de este volumen; no cronometrado.
- Aceptados por el cliente: pendiente.

## Hallazgos y acciones

- `ops/backup` y `docker-compose.prod.yml` asumen PostgreSQL 16, el servidor es 18.6: `backup.sh` y `restore.sh` fallarían por el mismo mismatch. Corregir en un cambio aparte, antes de activar backups automáticos.
- La tabla `_migrations_check` parece un residuo de ensayo; revisar después del Go-Live.
- Un contenedor `restore-test` viejo (v16) enmascaró el primer intento de restore: usar siempre `docker rm -f` antes de recrear.
- El backup del lunes debe repetirse inmediatamente antes del cutover (checklist, sección 4).

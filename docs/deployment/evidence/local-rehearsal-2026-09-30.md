# Evidence — local release rehearsal + restore smoke — 2026-09-30

- **Entorno:** local (Docker), sin Railway, sin storage externo (MinIO efímero).
- **Datos:** sintéticos (seed demo + un cliente creado por API). Sin datos reales ni credenciales reales.
- **SHA base (A):** `c6141df` (HEAD de `feat/devops-backup-restore-rehearsal` al ejecutar). B = A + migración
  compatible descartable (`ALTER TABLE _migrations_check ADD COLUMN`). C = A + migración que falla (`SELECT 1/0`).
  B y C se construyeron desde una copia temporal; nada de eso está en el repo.
- **Comando:** `ops/rehearsal/local.sh`

## Pasos y tiempos (`ops/rehearsal/local.sh`)

| Paso                                                    | Resultado | Segundos |
| ------------------------------------------------------- | --------- | -------- |
| Build de imágenes A, B, C y frontend                    | PASS      | 233.2    |
| Deploy A: migración + `health/ready`                    | PASS      | 16.7     |
| MinIO efímero                                           | PASS      | 1.9      |
| Backup `pre-migration` (imagen `ops/backup`)            | PASS      | 4.1      |
| Deploy B: migración + `health/ready` + sentinel intacto | PASS      | 4.7      |
| **Rollback a A sobre esquema migrado por B** + `ready`  | PASS      | 2.9      |
| Migración fallida C: falla, A sigue sirviendo `ready`   | PASS      | 1.8      |
| Restore del backup `pre-migration` + validación         | PASS      | 7.1      |

Resultado: **PASS**. La imagen A funciona sobre el esquema migrado por B (migración expand-only), y una
migración fallida no interrumpe al despliegue anterior.

## Backup / restore (medido)

- Objeto: `rehearsal/pre-migration/erp-medico-rehearsal-<UTC>.dump.gpg`, 52 974 bytes, edad 19 s.
- `download / decrypt / restore / verify / total`: 1.19 / 0.12 / 4.97 / 0.09 / **7.13 s**.
- Checks de `verify-restore.sql`: 15/15 `ok` (11 tablas legibles, migraciones contiguas 32, stock ≥ 0,
  ledger == suma de movimientos, asignaciones ≤ total del pago). Esquema real (32 migraciones), sin filas.

## Smoke con claude-in-chrome sobre la base restaurada (`ops/rehearsal/restored-app.sh`)

Backup con la imagen de `ops/backup` → restore con `restore.sh` (total 7.98 s, 15/15 checks) → backend y
frontend apuntando a la base **restaurada**:

| Verificación                                      | Resultado                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Origen vs restaurado                              | 14 productos, 1 cliente, 2 usuarios — idénticos                   |
| Login `admin@erp.com` (usuario de seed sintético) | OK, dashboard carga                                               |
| `/products`                                       | 14 productos del seed, precios/IVA/costos correctos               |
| `/customers`                                      | "Cliente Restauracion SA", CUIT 30-50001091-2 (creado pre-backup) |
| `/treasury/checks`                                | Página carga, 200 en `GET /api/v1/checks`, estado vacío           |
| Consola / red                                     | Sin errores de consola; todas las llamadas `/api/` con 200        |

## RPO / RTO observados

- RPO teórico con backup diario: ≤ 24 h + duración del dump (segundos en este volumen).
- RTO técnico medido: ~8 s de restore+validación sobre un dump de ~59 KB. **No extrapolable** al volumen real:
  se debe repetir con el tamaño productivo y sumar tiempo humano (decisión, repuntar app, smoke).
- Aceptados por el cliente: **pendiente** (gate 5).

## Límites de esta evidencia (qué NO demuestra)

- No hay ventas, cobros, cheques ni comprobantes en el dataset: el ledger y `/treasury/checks` se validan por
  esquema e invariantes, no con movimientos reales. El test de `restore.test.sh` cubre la detección de un
  saldo corrompido con datos sintéticos.
- MinIO local no equivale al proveedor real: credenciales, red y costo reales se prueban al activar (gates).
- El ensayo en staging/producción (Railway) lo ejecuta una persona; este documento no lo reemplaza.
- DoD de #70 **no cerrado**: pendientes gates aprobados, backup externo real, restore con datos aprobados,
  RPO/RTO aceptados y rehearsal en staging.

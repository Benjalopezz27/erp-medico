# Backup & recovery — registro de gates (#70)

> Ningún backup con datos reales se copia a un destino que no figure aquí como **APROBADO**.
> Hasta que los 8 gates estén aprobados, `BACKUP_DESTINATION_APPROVED` permanece sin definir
> en cualquier entorno con datos reales (ver [runbook](backup-restore-runbook.md)).

| #   | Gate                                                   | Sugerencia de la issue                  | Estado    | Dueño | Fecha | Decisión / referencia |
| --- | ------------------------------------------------------ | --------------------------------------- | --------- | ----- | ----- | --------------------- |
| 1   | Proveedor de almacenamiento y costo mensual            | —                                       | PENDIENTE |       |       |                       |
| 2   | Región / ubicación de los datos                        | —                                       | PENDIENTE |       |       |                       |
| 3   | Política de cifrado y custodia de claves               | AES-256, custodia doble                 | PENDIENTE |       |       |                       |
| 4   | Retención objetivo                                     | 7 diarios, 4 semanales, 6 mensuales     | PENDIENTE |       |       |                       |
| 5   | RPO y RTO aceptables para el cliente                   | RPO ≤ 24 h (dump diario)                | PENDIENTE |       |       |                       |
| 6   | Responsables de alertas y de ejecutar el restore       | —                                       | PENDIENTE |       |       |                       |
| 7   | Clasificación de datos y requisitos legales aplicables | datos fiscales y personales (AGENTS §2) | PENDIENTE |       |       |                       |
| 8   | Ventana autorizada para el ensayo de recuperación      | —                                       | PENDIENTE |       |       |                       |

Estados: `PENDIENTE` · `APROBADO` · `RECHAZADO`. Cada aprobación referencia un comentario en la
issue #70 o un ADR en `docs/adr/`.

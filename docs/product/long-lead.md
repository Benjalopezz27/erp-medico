# Long-lead · Registro de trabajo de terceros

> Registro de todo lo que depende de un tercero (organismo, proveedor, o el propio cliente
> actuando como bloqueo externo) con un SLA que no es el sprint del proyecto. Nada de este
> archivo se inventa — cada fila cita el issue o archivo del repo donde está la evidencia; lo
> que no tiene evidencia queda como `<<HUECO M-NN>>`.

## Registro

| Qué                                                                                                                                 | Tercero                          | SLA declarado                                                                                                                     | Qué desbloquea                                                         | Sprint del trámite | Sprint del consumo                     | Dueño                                                | Estado                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------ | -------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Homologación ARCA/AFIP — certificado X.509 `.p12`, CUIT autorizado, punto de venta de homologación, endpoints WSAA/WSFE confirmados | ARCA (ex AFIP), organismo fiscal | <<HUECO M-04>> — sin SLA documentado en este repo; issue #9 lo marca como bloqueante gestionado "con el cliente durante Sprint 7" | Sprint 8 completo (#9 — US-26, US-27, emisión de Facturas A/B con CAE) | Sprint 7 (#8)      | Sprint 8 (#9)                          | <<HUECO M-04>> — responsable no declarado en el repo | Certificado de homologación presente en `secrets/homo_cert.p12` (local); homologación de staging cerrada — #69 CLOSED |
| Certificado y credenciales de producción ARCA/AFIP                                                                                  | ARCA (ex AFIP)                   | <<HUECO M-05>>                                                                                                                    | Emisión fiscal real en producción                                      | —                  | Posterior a Sprint 8, previo a Go-Live | <<HUECO M-05>>                                       | No iniciado — issue #69 marca explícitamente "certificado productivo" como fuera de alcance                           |
| Provisión de producción y Go-Live                                                                                                   | Railway (infraestructura)        | N/A — proveedor ya en uso, sin SLA de terceros más allá del propio servicio                                                       | Épica DevOps (#65), issue #71                                          | —                  | Sprint 10 (#11)                        | <<HUECO M-06>>                                       | No iniciado                                                                                                           |

## Cómo se usa este archivo

Una fila pasa de "no iniciado" a un estado cerrado cuando el trámite se completa contra su
fuente primaria (la issue de GitHub que lo trackea). Cada `<<HUECO M-NN>>` se resuelve en el
próximo touchpoint con el cliente (§3.2 del manual), no se completa por inferencia.

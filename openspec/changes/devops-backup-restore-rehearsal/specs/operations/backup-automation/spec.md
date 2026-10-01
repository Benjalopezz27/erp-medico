# Spec Delta

## Purpose

Define el comportamiento observable del backup automático de PostgreSQL: dump consistente, cifrado, almacenamiento externo, retención y alertas.

## ADDED Requirements

### Requirement: Backup cifrado y verificable

El sistema SHALL producir un dump lógico consistente de la base, con checksum SHA-256, cifrado antes de salir del host, y nombre que incluya ambiente y timestamp UTC.

#### Scenario: Backup exitoso

- **WHEN** se ejecuta el backup con base y credenciales válidas
- **THEN** se sube un objeto cifrado `<env>-<UTC>.dump.gpg` y su `.sha256`, y el objeto no contiene texto plano del dump

#### Scenario: Dump incompleto

- **WHEN** `pg_dump` termina con error o el archivo resultante está vacío
- **THEN** no se sube nada, el proceso sale con código distinto de cero y se señala fallo

### Requirement: Destino aprobado

El sistema SHALL negarse a subir backups si el destino no fue marcado como aprobado.

#### Scenario: Destino sin aprobación

- **WHEN** `BACKUP_DESTINATION_APPROVED` no es `true`
- **THEN** el proceso aborta antes de leer la base y no realiza ninguna llamada de red al storage

### Requirement: Retención diaria, semanal y mensual

El sistema SHALL conservar por defecto los últimos 7 diarios, 4 semanales y 6 mensuales y eliminar el resto, con valores configurables.

#### Scenario: Aplicación de retención

- **WHEN** existen 40 backups diarios consecutivos y corre la retención
- **THEN** quedan exactamente los 7 diarios más recientes, 4 semanales y 6 mensuales (sin duplicar objetos que cumplan más de una categoría)

#### Scenario: Retención nunca borra el único backup válido

- **WHEN** la subida del backup actual falló
- **THEN** la retención no se ejecuta

### Requirement: Backup previo a migración riesgosa

El sistema SHALL permitir un backup etiquetado `pre-migration` fuera de la rotación GFS, conservando los últimos 5.

#### Scenario: Backup etiquetado

- **WHEN** se ejecuta el backup con etiqueta `pre-migration`
- **THEN** el objeto se guarda bajo un prefijo aparte y no es eliminado por la retención diaria/semanal/mensual

### Requirement: Alertas por fallo o antigüedad

El sistema SHALL notificar a la URL de heartbeat configurada al iniciar, al tener éxito y al fallar, y SHALL poder verificar que el último backup no supere una antigüedad máxima.

#### Scenario: Fallo de credenciales del storage

- **WHEN** las credenciales del storage son inválidas
- **THEN** se envía la señal de fallo, el código de salida es distinto de cero y ningún secreto aparece en la salida

#### Scenario: Backup antiguo

- **WHEN** el último backup supera `BACKUP_MAX_AGE_HOURS`
- **THEN** la verificación de antigüedad sale con error y envía la señal de fallo

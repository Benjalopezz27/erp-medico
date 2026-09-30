# Spec Delta

## Purpose
Define cómo se restaura un backup en una base temporal aislada, cómo se valida su integridad funcional mínima y cómo se miden RPO y RTO.

## ADDED Requirements

### Requirement: Restore aislado
El sistema SHALL restaurar un backup solo en una base temporal aislada, nunca en la base de origen.

#### Scenario: Restore en contenedor temporal
- **WHEN** se ejecuta el restore con un backup válido
- **THEN** se crea un PostgreSQL 16 efímero sin puertos publicados, se restaura allí y se destruye al terminar salvo que se pida conservarlo

#### Scenario: Destino igual al origen
- **WHEN** el host/base destino coincide con el de origen configurado
- **THEN** el restore aborta antes de modificar nada

### Requirement: Detección de backup corrupto
El sistema SHALL verificar checksum y descifrado antes de restaurar.

#### Scenario: Backup corrupto o truncado
- **WHEN** el checksum no coincide o el descifrado falla
- **THEN** el restore aborta con error explícito y no crea base restaurada

### Requirement: Validación funcional mínima
El sistema SHALL ejecutar chequeos SQL sobre la base restaurada: migraciones aplicadas completas, tablas críticas legibles, stock no negativo e invariantes del ledger de cobranzas.

#### Scenario: Restore íntegro
- **WHEN** termina el restore de un backup sano
- **THEN** todos los chequeos pasan y se emite un reporte JSON

#### Scenario: Invariante violada
- **WHEN** algún chequeo falla
- **THEN** el proceso sale con error y el reporte identifica el chequeo

### Requirement: Medición de RPO y RTO
El sistema SHALL emitir un reporte con duración de descarga, descifrado, restore y validación, y la edad del backup usado.

#### Scenario: Restore desde copia anterior
- **WHEN** se restaura un backup que no es el más reciente
- **THEN** el reporte indica su edad y el restore es válido igual

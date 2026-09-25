# Spec Delta

## Purpose

Compartir el ticket de acceso WSAA (Token/Sign) entre el proceso API y el proceso worker mediante
una caché en Redis, evitando logins WSAA redundantes por proceso y respetando la expiración real
del ticket.

## ADDED Requirements

### Requirement: Reutilización del ticket vigente entre procesos

El sistema SHALL almacenar el Token/Sign de WSAA obtenido en un login exitoso en una clave de
Redis separada por ambiente, servicio y CUIT, y SHALL reutilizarlo desde cualquier proceso (API o
worker) mientras conserve margen de vigencia suficiente, en lugar de solicitar un login WSAA
nuevo.

#### Scenario: Ticket vigente reutilizado por el worker

- **WHEN** el proceso worker necesita autenticarse y existe en Redis un ticket cacheado por el
  proceso API con más de 10 minutos de vigencia restante
- **THEN** el worker reutiliza ese ticket sin invocar el login WSAA

#### Scenario: Ticket ausente o vencido

- **WHEN** no existe ticket cacheado en Redis, o el cacheado tiene menos del margen mínimo de
  vigencia
- **THEN** el sistema solicita un login WSAA nuevo y almacena el resultado en Redis

### Requirement: TTL máximo y margen de seguridad

El sistema SHALL fijar un TTL máximo de 12 horas para el ticket cacheado en Redis, y SHALL respetar
además la expiración real informada por WSAA cuando sea menor a las 12 horas, renovando con margen
antes de que el ticket expire.

#### Scenario: Expiración real menor al TTL máximo

- **WHEN** WSAA informa una expiración a las 8 horas
- **THEN** el sistema no reutiliza ese ticket después de esas 8 horas, aunque el TTL máximo
  configurado sea 12 horas

### Requirement: Aislamiento por ambiente

El sistema SHALL construir la clave de caché de forma que un ticket obtenido en homologación nunca
sea reutilizable en producción ni viceversa, y sin exponer el secreto en el nombre de la clave.

#### Scenario: Ambientes distintos no comparten ticket

- **WHEN** existe un ticket cacheado para `ARCA_ENV=homologation`
- **THEN** un proceso corriendo con `ARCA_ENV=production` no lo reutiliza

### Requirement: Degradación ante caída de Redis

El sistema SHALL seguir funcionando cuando Redis no está disponible para el caché de ticket,
solicitando el login WSAA directamente en cada intento en lugar de fallar toda la emisión por la
falta de caché compartido.

#### Scenario: Redis caído durante la autenticación

- **WHEN** Redis no responde al intentar leer o escribir el ticket cacheado
- **THEN** el sistema realiza el login WSAA directamente y continúa el flujo de emisión sin caché
  compartido, registrando la degradación

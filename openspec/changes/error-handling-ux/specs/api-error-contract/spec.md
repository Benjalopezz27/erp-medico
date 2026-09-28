## Purpose

Define un contrato de error único y compartido entre backend y frontend, para que toda falla —
sincrónica en un request HTTP o asincrónica en un job en background — sea reportable con la misma
estructura y con suficiente detalle para diagnosticar y para mostrarla al usuario.

## ADDED Requirements

### Requirement: Contrato de error HTTP compartido

Toda respuesta de error de la API HTTP SHALL tener una estructura única, compartida como tipo entre
backend y frontend, que incluya como mínimo: código de estado HTTP, un código de error estable
(machine-readable), un mensaje legible, un identificador de request para correlación, un timestamp
y el path afectado.

#### Scenario: Excepción HTTP conocida

- **WHEN** un endpoint lanza una excepción HTTP conocida (por ejemplo una excepción de dominio con
  código propio)
- **THEN** la respuesta incluye el `code` de esa excepción, un mensaje legible y el `requestId` de
  correlación

#### Scenario: Error no controlado

- **WHEN** un endpoint lanza un error no controlado (no es una `HttpException` ni tiene forma
  reconocida)
- **THEN** la respuesta sigue la misma estructura de error, con un código genérico de servidor y sin
  exponer detalles internos sensibles (stack trace, secretos)

### Requirement: Errores de validación con estructura por campo

Los errores de validación de entrada SHALL exponer, por cada campo inválido, el nombre del campo y
el motivo del rechazo, en vez de un arreglo plano de mensajes sin asociación a campo.

#### Scenario: Payload con múltiples campos inválidos

- **WHEN** un request llega con dos o más campos que no cumplen las reglas de validación del DTO
- **THEN** la respuesta de error lista cada campo inválido junto con su motivo, permitiendo mapear
  cada uno a su control de formulario correspondiente

### Requirement: Errores de jobs asincrónicos con código tipado

Todo fallo de un job en background (por ejemplo, procesamiento de comprobantes fiscales vía cola)
que se persiste como estado final o transitorio SHALL registrarse con un código de error tipado y un
mensaje legible, siguiendo el mismo vocabulario de códigos que los errores HTTP de dominio, en vez
de un mensaje de error genérico sin código.

#### Scenario: Job de facturación falla de forma terminal

- **WHEN** un job de emisión de comprobante fiscal falla de forma no recuperable (por ejemplo,
  rechazo de ARCA/AFIP)
- **THEN** el estado persistido del comprobante incluye un código de error tipado y un mensaje
  legible, consultable por quien revisa el comprobante en el frontend

#### Scenario: Job de facturación falla de forma transitoria

- **WHEN** un job de emisión de comprobante fiscal falla por un error transitorio (por ejemplo, un
  timeout de red) y queda pendiente de reintento
- **THEN** el estado persistido registra un código de error tipado distinguible de un fallo
  terminal, para que el frontend pueda mostrar "reintentando" en vez de "falló"

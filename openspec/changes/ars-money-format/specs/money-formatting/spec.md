# Spec Delta

## Purpose

Define cómo la aplicación muestra e ingresa montos en pesos argentinos, con un único formato y feedback visual para evitar errores de carga por ceros de más o de menos.

## ADDED Requirements

### Requirement: Formato único de montos en vistas

Toda vista de solo lectura SHALL mostrar montos en pesos con el formato `es-AR`: prefijo `$ `, punto como separador de miles y coma decimal (`$ 1.500.000,00`), con 2 decimales salvo que el dato requiera más precisión. Un valor ausente o no numérico MUST mostrarse como `—`. Los montos negativos MUST conservar el signo.

#### Scenario: Monto con miles

- **WHEN** una vista muestra el valor `"1500000.5"`
- **THEN** se renderiza `$ 1.500.000,50`

#### Scenario: Valor ausente

- **WHEN** una vista muestra `null` o `""`
- **THEN** se renderiza `—`

#### Scenario: Monto negativo

- **WHEN** una vista muestra `"-1250.5"`
- **THEN** se renderiza con signo negativo y el mismo formato de miles y decimales

### Requirement: Input de monto con separadores

Todo campo que capture dinero SHALL formatear el texto mientras se tipea con punto de miles y coma decimal, mostrar el prefijo `$` y alinear el texto a la derecha. El campo MUST entregar al formulario el valor numérico crudo con punto decimal y sin separadores, nunca el texto formateado.

#### Scenario: Tipeo de millón

- **WHEN** el usuario tipea `1500000`
- **THEN** el campo muestra `1.500.000` y el formulario recibe `"1500000"`

#### Scenario: Decimales

- **WHEN** el usuario tipea `1500000,5`
- **THEN** el campo muestra `1.500.000,5` y el formulario recibe `"1500000.5"`

#### Scenario: Pegado de texto formateado

- **WHEN** el usuario pega `1.500.000,5`
- **THEN** el campo muestra `1.500.000,5` y el formulario recibe `"1500000.5"`

#### Scenario: Edición en medio del número

- **WHEN** el usuario inserta o borra un dígito en medio del número
- **THEN** los separadores se recalculan y el cursor permanece junto al dígito editado

### Requirement: Límites numéricos del input de monto

El input de monto SHALL limitar los decimales a la cantidad configurada (2 por defecto, 4 para costos), impedir ingresar un valor mayor al tope configurado y rechazar el signo negativo salvo que el campo lo permita explícitamente. Caracteres no numéricos MUST ser ignorados.

#### Scenario: Exceso de decimales

- **WHEN** el campo admite 2 decimales y el usuario tipea `10,999`
- **THEN** el campo conserva `10,99`

#### Scenario: Tope máximo

- **WHEN** el valor tipeado supera el tope del campo
- **THEN** se mantiene el último valor válido

#### Scenario: Negativo no permitido

- **WHEN** el usuario tipea `-` en un campo que no admite negativos
- **THEN** el signo se ignora

### Requirement: Ayuda de magnitud

El input de monto SHALL mostrar una ayuda compacta de magnitud (por ejemplo `1,5 M`) cuando el valor alcance los miles, para detectar ceros de más o de menos antes de guardar.

#### Scenario: Valor en millones

- **WHEN** el campo contiene `1.500.000`
- **THEN** se muestra la ayuda `1,5 M`

#### Scenario: Valor menor a mil

- **WHEN** el campo contiene `950`
- **THEN** no se muestra ayuda de magnitud

### Requirement: Alcance de los inputs de monto

Los campos de cantidad, stock, porcentaje y factor de conversión MUST NOT usar el input de monto ni el prefijo `$`.

#### Scenario: Cantidad de stock

- **WHEN** el usuario edita una cantidad de stock
- **THEN** el campo no muestra prefijo `$` ni separadores de monto

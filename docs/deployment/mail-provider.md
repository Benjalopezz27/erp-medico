# Mail transaccional (recuperación de contraseña)

Proveedor: **Resend**, por API HTTPS (`POST https://api.resend.com/emails`). Railway bloquea SMTP
saliente en planes Free/Trial/Hobby, por eso no se usa `nodemailer`/SMTP. Todo el código del
proveedor vive en `apps/backend/src/modules/mail/mail.service.ts`; cambiar de proveedor solo toca ese archivo.

## Variables de entorno

| Variable         | Dónde        | Descripción                                                                                    |
| ---------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `MAIL_API_KEY`   | API + worker | API key de Resend. Obligatoria con `NODE_ENV=production` (si falta, el job falla y reintenta). |
| `MAIL_FROM`      | API + worker | Remitente de un dominio verificado, ej. `ERP <no-reply@dominio>`.                              |
| `APP_PUBLIC_URL` | worker       | URL pública del frontend; arma el link `…/reset-password?token=…`.                             |

El mail se envía desde el **worker** (cola BullMQ `mail-send`, 5 intentos con backoff exponencial):
las variables deben estar en el servicio worker de Railway. Fuera de producción solo se loguea el link.

## Alta del proveedor (pendiente, `needs:client` si el dominio es del cliente)

1. Crear cuenta Resend y generar API key.
2. Agregar el dominio de envío y cargar los registros DNS **SPF, DKIM** (y DMARC recomendado).
3. Esperar estado `verified`, cargar las variables en production y pedir un reset de prueba.

const BRAND_BLUE = '#2563eb';
const APP_NAME = 'ERP Distribuidora Médica';

export const PASSWORD_RESET_SUBJECT = `Restablecé tu contraseña de ${APP_NAME}`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Table-based layout with inline styles: the only thing every mail client renders alike. */
export function renderPasswordResetEmail(link: string): {
  html: string;
  text: string;
} {
  const href = escapeHtml(link);
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Usá este link para elegir una contraseña nueva. Vence en 30 minutos.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${BRAND_BLUE};padding:20px 32px;color:#ffffff;font-size:18px;font-weight:bold;">${APP_NAME}</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Restablecé tu contraseña</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#334155;">Recibimos un pedido para cambiar la contraseña de tu cuenta. Hacé clic en el botón para elegir una nueva.</p>
<p style="margin:0 0 24px;"><a href="${href}" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">Elegir contraseña nueva</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">El link vence en 30 minutos y solo se puede usar una vez.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Si no fuiste vos, ignorá este mail: tu contraseña no cambia.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;">Mensaje automático de ${APP_NAME}. Por favor no respondas a este mail.</td></tr>
</table></td></tr></table></body></html>`;

  const text = `${APP_NAME}

Restablecé tu contraseña

Recibimos un pedido para cambiar la contraseña de tu cuenta. Abrí este link para elegir una nueva:

${link}

El link vence en 30 minutos y solo se puede usar una vez.
Si no fuiste vos, ignorá este mail: tu contraseña no cambia.

Mensaje automático de ${APP_NAME}. Por favor no respondas a este mail.`;

  return { html, text };
}

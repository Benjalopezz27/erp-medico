import { Mail, Phone, MessageCircle } from 'lucide-react';
import { buildMailtoUrl, buildWhatsappUrl } from '../utils/contact.utils';

interface SupplierContactLinksProps {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
}

export function SupplierContactLinks({ email, phone, whatsapp }: SupplierContactLinksProps) {
  const mailtoUrl = buildMailtoUrl(email);
  const whatsappUrl = buildWhatsappUrl(whatsapp);

  const hasAnyContact = Boolean(email || phone || whatsapp);

  if (!hasAnyContact) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      {email && (
        <div className="inline-flex items-center gap-1.5 truncate max-w-[220px]">
          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {mailtoUrl ? (
            <a
              href={mailtoUrl}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline truncate"
              title={`Enviar correo a ${email}`}
            >
              {email}
            </a>
          ) : (
            <span className="text-gray-600 dark:text-gray-300 truncate">{email}</span>
          )}
        </div>
      )}

      {phone && (
        <div className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>{phone}</span>
        </div>
      )}

      {whatsapp && (
        <div className="inline-flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium hover:underline inline-flex items-center gap-1"
              title={`Abrir chat de WhatsApp con ${whatsapp}`}
            >
              <span>{whatsapp}</span>
            </a>
          ) : (
            <span className="text-gray-600 dark:text-gray-300">{whatsapp}</span>
          )}
        </div>
      )}
    </div>
  );
}

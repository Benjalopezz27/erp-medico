import { Mail, MapPin, Phone } from 'lucide-react';
import { buildMailtoUrl, buildTelUrl } from '../utils/customer-contact.utils';

export function CustomerContactLinks({
  email,
  phone,
  address,
}: {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  if (!email && !phone && !address)
    return <span className="text-xs text-slate-400">Sin contacto</span>;
  const mailto = buildMailtoUrl(email);
  const tel = buildTelUrl(phone);
  return (
    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
      {email && (
        <div className="flex items-center gap-1.5 min-w-0">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {mailto ? (
            <a className="truncate text-blue-600 hover:underline" href={mailto}>
              {email}
            </a>
          ) : (
            <span>{email}</span>
          )}
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {tel ? (
            <a className="text-blue-600 hover:underline" href={tel}>
              {phone}
            </a>
          ) : (
            <span>{phone}</span>
          )}
        </div>
      )}
      {address && (
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{address}</span>
        </div>
      )}
    </div>
  );
}

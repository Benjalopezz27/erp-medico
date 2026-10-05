import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TermsLink } from '@/features/legal/TermsLink';
import { FAQ, HELP_SECTIONS } from './help.content';
import { SUPPORT_CONTACT } from './support.config';

const INDEX = [
  ...HELP_SECTIONS.map(({ id, title }) => ({ id, title })),
  { id: 'faq', title: 'Preguntas frecuentes' },
  { id: 'contacto', title: 'Contacto' },
];

export const HelpView: React.FC = () => (
  <div className="flex flex-col gap-6 lg:flex-row">
    <nav aria-label="Secciones de ayuda" className="lg:sticky lg:top-20 lg:w-56 lg:self-start">
      <ul className="space-y-1 text-sm">
        {INDEX.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className="block rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              {title}
            </a>
          </li>
        ))}
      </ul>
    </nav>

    <div className="min-w-0 flex-1 space-y-6">
      {HELP_SECTIONS.map((s) => (
        <Card key={s.id} id={s.id}>
          <CardHeader>
            <CardTitle className="text-lg">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card id="faq">
        <CardHeader>
          <CardTitle className="text-lg">Preguntas frecuentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.question} className="rounded-xl border border-slate-200 px-4 py-2">
              <summary className="cursor-pointer text-sm font-medium">{f.question}</summary>
              <p className="pt-2 text-sm text-slate-700">{f.answer}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card id="contacto">
        <CardHeader>
          <CardTitle className="text-lg">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-700">
          <p>Correo: {SUPPORT_CONTACT.email}</p>
          <p>WhatsApp: {SUPPORT_CONTACT.whatsapp}</p>
          <p>Horario: {SUPPORT_CONTACT.hours}</p>
          <p>Versión de la app: {__APP_VERSION__}</p>
          <p className="pt-2">
            <TermsLink className="text-blue-600 hover:underline" /> ·{' '}
            <Link to="/account" className="text-blue-600 hover:underline">
              Mi cuenta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
);

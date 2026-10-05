import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { TERMS_SECTIONS, TERMS_UPDATED_AT, TERMS_VERSION } from './terms.content';

export const TermsView: React.FC = () => (
  <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
    <header className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">Términos y condiciones</h1>
      <p className="text-sm text-muted-foreground">
        Versión {TERMS_VERSION} · Última actualización: {TERMS_UPDATED_AT}
      </p>
      <p role="note" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Texto provisorio, pendiente de validación por el cliente o su asesor legal.
      </p>
    </header>

    <nav aria-label="Secciones" className="text-sm">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {TERMS_SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="text-blue-600 hover:underline">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>

    <Card>
      <CardContent className="space-y-6 pt-6">
        {TERMS_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="text-sm text-slate-700">
                {p}
              </p>
            ))}
          </section>
        ))}
      </CardContent>
    </Card>

    <Link to="/login" className="text-sm text-blue-600 hover:underline">
      Volver
    </Link>
  </div>
);

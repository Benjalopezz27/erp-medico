export const TERMS_VERSION = '0.1-provisorio';
export const TERMS_UPDATED_AT = '2026-10-05';

// PROVISIONAL (needs:client): texto base a reemplazar por el texto validado por el cliente o su
// asesor legal. No constituye texto legal definitivo.
export interface TermsSection {
  id: string;
  title: string;
  body: string[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'uso',
    title: 'Uso aceptable',
    body: [
      'El sistema es de uso exclusivo del personal autorizado de la distribuidora. Cada cuenta es personal e intransferible.',
      'Queda prohibido compartir credenciales o usar el sistema para fines ajenos a la operación de la empresa.',
    ],
  },
  {
    id: 'datos',
    title: 'Tratamiento de datos',
    body: [
      'El sistema almacena datos de clientes, productos, ventas y comprobantes fiscales necesarios para la operación.',
      'Los datos personales se tratan solo para la gestión comercial y el cumplimiento de obligaciones fiscales.',
    ],
  },
  {
    id: 'responsabilidades',
    title: 'Responsabilidades',
    body: [
      'Cada usuario es responsable de las operaciones realizadas con su cuenta y de mantener su contraseña en reserva.',
      'La emisión de comprobantes fiscales se rige por la normativa vigente de ARCA/AFIP.',
    ],
  },
  {
    id: 'cambios',
    title: 'Cambios a estos términos',
    body: [
      'Estos términos pueden actualizarse. La versión y fecha vigentes figuran al inicio de esta página.',
    ],
  },
];

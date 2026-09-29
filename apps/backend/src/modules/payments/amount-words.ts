const UNITS = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
];
/** Apócope ante 'mil' / 'millones': uno → un, veintiuno → veintiún. */
const apocope = (words: string): string =>
  words.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');

const TENS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
];
const HUNDREDS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
];

function below1000(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (rest < 30) {
    if (rest) parts.push(UNITS[rest]);
  } else {
    const t = TENS[Math.floor(rest / 10)];
    parts.push(rest % 10 ? `${t} y ${UNITS[rest % 10]}` : t);
  }
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'cero';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (millions) {
    parts.push(
      millions === 1 ? 'un millón' : `${apocope(below1000(millions))} millones`,
    );
  }
  if (thousands) {
    parts.push(
      thousands === 1 ? 'mil' : `${apocope(below1000(thousands))} mil`,
    );
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

/** "1250.50" → "mil doscientos cincuenta con 50/100". Opera sobre el string decimal. */
export function amountToWords(amount: string): string {
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match)
    throw new Error(`Importe inválido para expresar en letras: ${amount}`);
  const cents = (match[2] ?? '').padEnd(2, '0');
  return `${integerToWords(Number(match[1]))} con ${cents}/100`;
}

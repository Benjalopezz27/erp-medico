import { BadRequestException } from '@nestjs/common';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** `YYYY-MM-DD` real del calendario, o undefined si el filtro viene vacío. */
export function parseDate(
  value: string | undefined,
  name: string,
): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
  if (!valid)
    throw new BadRequestException(`${name} inválido: use YYYY-MM-DD.`);
  return value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuid(
  value: string | undefined,
  name: string,
): string | undefined {
  if (!value) return undefined;
  if (!UUID.test(value)) throw new BadRequestException(`${name} inválido.`);
  return value;
}

export function oneOf(
  value: string | undefined,
  allowed: readonly string[],
  name: string,
): string | undefined {
  if (!value) return undefined;
  if (!allowed.includes(value))
    throw new BadRequestException(`${name} inválido: ${value}.`);
  return value;
}

/** Arma un WHERE parametrizado ($n); los filtros nunca se interpolan en el SQL. */
export class WhereBuilder {
  private readonly clauses: string[] = [];
  readonly params: unknown[] = [];

  /** `clause` lleva un único `?` que se reemplaza por el parámetro. */
  add(clause: string, value: unknown): this {
    this.params.push(value);
    this.clauses.push(clause.replace('?', `$${this.params.length}`));
    return this;
  }

  /** Cláusula fija, sin parámetro. */
  raw(clause: string): this {
    this.clauses.push(clause);
    return this;
  }

  addIf(clause: string, value: string | undefined): this {
    return value ? this.add(clause, value) : this;
  }

  /** Rango inclusivo por día argentino; `timestamp=false` para columnas `date`. */
  dateRange(
    column: string,
    filters: { from?: string; to?: string },
    timestamp = true,
  ): this {
    const expr = timestamp
      ? `(${column} AT TIME ZONE '${TIME_ZONE}')::date`
      : column;
    return this.addIf(`${expr} >= ?`, parseDate(filters.from, 'from')).addIf(
      `${expr} <= ?`,
      parseDate(filters.to, 'to'),
    );
  }

  sql(): string {
    return this.clauses.length ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }
}

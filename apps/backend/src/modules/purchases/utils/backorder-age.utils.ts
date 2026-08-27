export const BACKORDER_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const BACKORDER_URGENT_AFTER_DAYS = 14;

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BACKORDER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getCalendarDayOrdinal(date: Date): number {
  const parts = dayFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function calculateBackorderAgeDays(emittedAt: Date, now: Date): number {
  return Math.max(
    0,
    getCalendarDayOrdinal(now) - getCalendarDayOrdinal(emittedAt),
  );
}

export function isBackorderUrgent(ageDays: number): boolean {
  return ageDays > BACKORDER_URGENT_AFTER_DAYS;
}

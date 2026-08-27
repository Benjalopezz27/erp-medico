import {
  calculateBackorderAgeDays,
  isBackorderUrgent,
} from './backorder-age.utils';

describe('backorder age utilities', () => {
  it('uses Buenos Aires calendar days instead of elapsed 24-hour periods', () => {
    const emittedAt = new Date('2026-08-12T23:30:00-03:00');
    const now = new Date('2026-08-27T00:05:00-03:00');

    expect(calculateBackorderAgeDays(emittedAt, now)).toBe(15);
  });

  it('marks day 14 as normal and day 15 as urgent', () => {
    expect(isBackorderUrgent(14)).toBe(false);
    expect(isBackorderUrgent(15)).toBe(true);
  });

  it('does not return a negative age for a future timestamp', () => {
    expect(
      calculateBackorderAgeDays(
        new Date('2026-08-28T10:00:00-03:00'),
        new Date('2026-08-27T10:00:00-03:00'),
      ),
    ).toBe(0);
  });
});

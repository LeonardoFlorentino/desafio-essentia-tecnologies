import { formatDay, maskDay, parseDay, today } from './dates';

describe('dates (dd/mm/aaaa ↔ YYYY-MM-DD)', () => {
  it('shows a day in the Brazilian order, without going through a time zone', () => {
    expect(formatDay('2026-01-05')).toBe('05/01/2026');
  });

  it("uses the user's local day for today", () => {
    expect(today(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it.each([
    ['2', '2'],
    ['2510', '25/10'],
    ['25102026', '25/10/2026'],
    ['25/10/2026', '25/10/2026'],
    ['25a10b2026', '25/10/2026'],
    ['251020269', '25/10/2026'],
    ['', ''],
  ])('masks "%s" as "%s" while typing', (typed, shown) => {
    expect(maskDay(typed)).toBe(shown);
  });

  it.each([
    ['25/10/2026', '2026-10-25'],
    ['29/02/2028', '2028-02-29'],
    ['29/02/2026', null],
    ['31/04/2026', null],
    ['00/10/2026', null],
    ['10/13/2026', null],
    ['10/2026', null],
    ['2026-10-25', null],
  ])('reads "%s" as %s', (text, iso) => {
    expect(parseDay(text)).toBe(iso);
  });
});

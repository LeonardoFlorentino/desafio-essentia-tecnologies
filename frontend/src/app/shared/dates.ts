// Calendar days as the API speaks them (YYYY-MM-DD) and as people in Brazil write them
// (dd/mm/aaaa). Plain strings, never Date objects: a due date has no time and no time zone.

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Sunday first, as in Brazilian calendars. */
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDay(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** 2026-10-25 → 25/10/2026. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/** Today in the user's time zone, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  return isoDay(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Keeps only digits and adds the slashes while typing: "2510" → "25/10". */
export function maskDay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

/** "25/10/2026" → "2026-10-25"; null when incomplete or not a real day (31/02). */
export function parseDay(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month - 1)) return null;
  return isoDay(year, month - 1, day);
}

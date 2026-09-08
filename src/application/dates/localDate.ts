const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToLocalDateKey(dateKey: string, days: number): string {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new Error(`Invalid local date: ${dateKey}`);

  const [, year, month, day] = match;
  const localNoon = new Date(Number(year), Number(month) - 1, Number(day), 12);
  localNoon.setDate(localNoon.getDate() + days);
  return toLocalDateKey(localNoon);
}

export function isValidLocalDateKey(dateKey: string): boolean {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return false;
  const [, year, month, day] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day), 12);
  return toLocalDateKey(candidate) === dateKey;
}

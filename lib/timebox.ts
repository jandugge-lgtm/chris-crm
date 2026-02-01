// lib/timebox.ts
export const BERLIN_TZ = "Europe/Berlin";

// Liefert YYYY-MM-DD in Europe/Berlin
export function berlinDateKey(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // en-CA -> YYYY-MM-DD
}

// Hilfsfunktion: DateKey -> Date (Mittagszeit, damit nix "rutscht")
function keyToDateAtNoon(key: string): Date {
  // key: YYYY-MM-DD
  return new Date(`${key}T12:00:00Z`);
}

function addDaysKey(key: string, days: number): string {
  const d = keyToDateAtNoon(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Montag (ISO) als Wochenstart
export function weekRangeBerlin(ref: Date = new Date()) {
  const today = berlinDateKey(ref);
  const d = keyToDateAtNoon(today);

  // getUTCDay(): So=0, Mo=1, ..., Sa=6
  const dow = d.getUTCDay();
  const diffToMonday = (dow + 6) % 7; // Mo -> 0, Di -> 1, ..., So -> 6

  const monday = addDaysKey(today, -diffToMonday);
  const sunday = addDaysKey(monday, 6);

  return { today, monday, sunday };
}

export function isToday(plannedForKey?: string | null, ref: Date = new Date()) {
  if (!plannedForKey) return false;
  return plannedForKey === berlinDateKey(ref);
}

export function isThisWeek(plannedForKey?: string | null, ref: Date = new Date()) {
  if (!plannedForKey) return false;
  const { monday, sunday } = weekRangeBerlin(ref);
  return plannedForKey >= monday && plannedForKey <= sunday;
}

export function isOverdue(plannedForKey?: string | null, ref: Date = new Date()) {
  if (!plannedForKey) return false;
  return plannedForKey < berlinDateKey(ref);
}

export function isTomorrow(plannedForKey?: string | null, ref: Date = new Date()) {
  if (!plannedForKey) return false;
  const t = berlinDateKey(ref);
  const tomorrow = addDaysKey(t, 1);
  return plannedForKey === tomorrow;
}

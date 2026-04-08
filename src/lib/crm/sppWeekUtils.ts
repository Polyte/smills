import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from "date-fns";

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Map DB `week_starts_on` to date-fns weekStartsOn (0=Sun … 6=Sat). */
export function weekStartsOnFromDb(v: string): WeekStartsOn {
  if (v === "sunday") return 0;
  if (v === "saturday") return 6;
  return 1; // monday
}

export function parseYearMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1);
}

/**
 * Week-start dates (YYYY-MM-DD) for each week that overlaps the calendar month.
 * A week is included if any of its days fall inside [monthStart, monthEnd].
 */
export function monthWeekStarts(ym: string, weekStartsOn: WeekStartsOn): string[] {
  const monthStart = startOfMonth(parseYearMonth(ym));
  const monthEnd = endOfMonth(monthStart);
  let cur = startOfWeek(monthStart, { weekStartsOn });
  const out: string[] = [];
  while (true) {
    const weekEnd = addDays(cur, 6);
    if (weekEnd < monthStart) {
      cur = addDays(cur, 7);
      continue;
    }
    if (cur > monthEnd) break;
    out.push(format(cur, "yyyy-MM-dd"));
    cur = addDays(cur, 7);
  }
  return out;
}

/** Split a monthly quantity evenly across N weeks (last week absorbs rounding remainder). */
export function distributeQtyAcrossWeeks(total: number | null | undefined, weekCount: number): number[] {
  if (!weekCount) return [];
  const t = Number(total ?? 0);
  if (!Number.isFinite(t) || t <= 0) return Array(weekCount).fill(0);
  const cents = Math.round(t * 100);
  const per = Math.floor(cents / weekCount);
  const rem = cents - per * weekCount;
  return Array.from({ length: weekCount }, (_, i) =>
    i === weekCount - 1 ? (per + rem) / 100 : per / 100
  );
}

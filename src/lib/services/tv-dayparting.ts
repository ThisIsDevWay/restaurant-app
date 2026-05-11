/**
 * Dayparting helpers: decide whether a media item is "active" at the current
 * local time in the restaurant's timezone (Caracas, UTC-04:00).
 *
 * Each item has three optional fields:
 *   - daypartStartMinutes (0..1439) — start of the active window
 *   - daypartEndMinutes   (0..1439) — end of the active window
 *   - daypartDaysMask     (0..127)  — 7-bit mask, bit 0=Sun .. bit 6=Sat
 *
 * If all three are NULL the item plays always (no time/day restriction).
 *
 * If only the time window is set, days mask defaults to "every day".
 * If only the days mask is set, the time window defaults to "all day".
 * If `start <= end` the window is the natural interval [start, end).
 * If `start >  end` the window wraps midnight (e.g. 22:00→02:00 means
 * "10pm–2am next day"). `start == end` is treated as "always" to avoid
 * empty windows.
 */

const RESTAURANT_TZ = "America/Caracas";

export type DaypartFields = {
  daypartStartMinutes: number | null;
  daypartEndMinutes: number | null;
  daypartDaysMask: number | null;
};

/** Read the current minute-of-day + day-of-week in the restaurant TZ. */
export function getCurrentLocalTimeInfo(now: Date = new Date()): {
  minuteOfDay: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
} {
  // Intl.DateTimeFormat is the only stable way to read "wall-clock time in
  // an arbitrary IANA timezone" on Node without pulling in tz libraries.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  let hour = 0;
  let minute = 0;
  let weekdayLabel = "Sun";
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    else if (p.type === "minute") minute = parseInt(p.value, 10);
    else if (p.type === "weekday") weekdayLabel = p.value;
  }

  // `en-US` short weekday: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = map[weekdayLabel] ?? 0;

  // Intl 24h format can return "24" for midnight in some locales — clamp.
  if (hour >= 24) hour = 0;
  return { minuteOfDay: hour * 60 + minute, dayOfWeek };
}

/**
 * Returns true when `item` should be playing right now according to its
 * dayparting fields. NULL fields = no restriction in that dimension.
 */
export function isItemActiveNow(
  item: DaypartFields,
  now: Date = new Date(),
): boolean {
  const noTime =
    item.daypartStartMinutes == null && item.daypartEndMinutes == null;
  const noDays = item.daypartDaysMask == null;
  if (noTime && noDays) return true;

  const { minuteOfDay, dayOfWeek } = getCurrentLocalTimeInfo(now);

  // Day-of-week check (only if a mask is set).
  if (item.daypartDaysMask != null) {
    const dayBit = 1 << dayOfWeek;
    if ((item.daypartDaysMask & dayBit) === 0) return false;
  }

  // Time-window check.
  if (item.daypartStartMinutes != null && item.daypartEndMinutes != null) {
    const start = item.daypartStartMinutes;
    const end = item.daypartEndMinutes;
    if (start === end) return true; // degenerate → always on
    if (start < end) {
      return minuteOfDay >= start && minuteOfDay < end;
    }
    // Wrap-around window (e.g. 22:00 → 02:00).
    return minuteOfDay >= start || minuteOfDay < end;
  }

  // If only one bound is set, treat the missing one as the day's edge so
  // partial fills behave intuitively (e.g. start=18:00 with no end → from
  // 18:00 to midnight).
  if (item.daypartStartMinutes != null) {
    return minuteOfDay >= item.daypartStartMinutes;
  }
  if (item.daypartEndMinutes != null) {
    return minuteOfDay < item.daypartEndMinutes;
  }

  return true;
}

/** Pretty-print a minute-of-day as HH:mm (for UI). */
export function formatMinuteOfDay(m: number | null | undefined): string {
  if (m == null) return "";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Parse "HH:mm" → minute-of-day. Returns null when invalid. */
export function parseMinuteOfDay(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mins = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mins)) return null;
  if (h < 0 || h > 23 || mins < 0 || mins > 59) return null;
  return h * 60 + mins;
}

export const DAY_LABELS_ES: ReadonlyArray<{ bit: number; short: string; full: string }> = [
  { bit: 0, short: "Dom", full: "Domingo" },
  { bit: 1, short: "Lun", full: "Lunes" },
  { bit: 2, short: "Mar", full: "Martes" },
  { bit: 3, short: "Mié", full: "Miércoles" },
  { bit: 4, short: "Jue", full: "Jueves" },
  { bit: 5, short: "Vie", full: "Viernes" },
  { bit: 6, short: "Sáb", full: "Sábado" },
];

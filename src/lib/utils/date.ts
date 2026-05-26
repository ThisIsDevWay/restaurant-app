/**
 * Returns today's date string (YYYY-MM-DD) in Venezuela time (UTC-4).
 * Vercel servers run UTC; without this, dates flip at 8:00 PM VET.
 */
export function todayCaracas(): string {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Caracas",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
}

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Current weekday (0=Sun..6=Sat) and minutes-since-midnight in America/Caracas.
 */
export function getNowCaracas(date: Date = new Date()): { weekday: number; minutes: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Caracas",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const weekday = WEEKDAY_INDEX[get("weekday")] ?? 0;
    const hour = parseInt(get("hour"), 10) || 0;
    const minute = parseInt(get("minute"), 10) || 0;
    return { weekday, minutes: hour * 60 + minute };
}

function parseHHMM(s: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
}

export interface BusinessHours {
    days: number[];
    open: string;
    close: string;
}

/**
 * Whether the restaurant is currently open, in America/Caracas time.
 * Returns null when business hours are not configured (so callers can hide the badge).
 * Handles overnight windows (e.g. 18:00–02:00), which belong to the day they start.
 */
export function isOpenNow(
    bh: BusinessHours | null | undefined,
    now: { weekday: number; minutes: number } = getNowCaracas(),
): boolean | null {
    if (!bh || !bh.days?.length || !bh.open || !bh.close) return null;
    const open = parseHHMM(bh.open);
    const close = parseHHMM(bh.close);
    if (open === null || close === null || open === close) return null;

    const { weekday, minutes } = now;

    if (close > open) {
        return bh.days.includes(weekday) && minutes >= open && minutes < close;
    }

    // Overnight window: opens today, closes after midnight.
    if (minutes >= open) return bh.days.includes(weekday);
    const prevDay = (weekday + 6) % 7;
    return minutes < close && bh.days.includes(prevDay);
}

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

export interface BusinessHoursInterval {
    open: string;
    close: string;
}

export interface DaySchedule {
    isOpen: boolean;
    intervals: BusinessHoursInterval[];
}

export type BusinessHours = 
    | {
        days: number[];
        open: string;
        close: string;
      }
    | {
        [day: string]: DaySchedule;
      };

export interface StandardizedBusinessHours {
    isOpen: boolean;
    intervals: BusinessHoursInterval[];
}

/**
 * Normalizes any business hours representation (legacy or new) to a standard Record<number, DaySchedule>.
 */
export function normalizeBusinessHours(bh: any): Record<number, StandardizedBusinessHours> {
    const result: Record<number, StandardizedBusinessHours> = {};
    for (let i = 0; i < 7; i++) {
        result[i] = { isOpen: false, intervals: [] };
    }

    if (!bh) return result;

    // Check if it's already in the new format (key-value structure with day index as keys, or array of DaySchedule)
    if (typeof bh === "object" && !Array.isArray(bh.days) && ("0" in bh || "1" in bh || "2" in bh || "3" in bh || "4" in bh || "5" in bh || "6" in bh)) {
        for (let i = 0; i < 7; i++) {
            const dayKey = String(i);
            const dayData = bh[dayKey];
            if (dayData) {
                result[i] = {
                    isOpen: !!dayData.isOpen,
                    intervals: Array.isArray(dayData.intervals)
                        ? dayData.intervals.map((inv: any) => ({
                              open: String(inv.open || "09:00"),
                              close: String(inv.close || "18:00"),
                          }))
                        : [],
                };
            }
        }
        return result;
    }

    // Legacy format converter
    const legacyDays = Array.isArray(bh.days) ? bh.days : [];
    const openTime = bh.open || "";
    const closeTime = bh.close || "";
    const hasTime = openTime && closeTime;

    for (let i = 0; i < 7; i++) {
        const active = legacyDays.includes(i);
        result[i] = {
            isOpen: active,
            intervals: (active && hasTime) ? [{ open: openTime, close: closeTime }] : [],
        };
    }
    return result;
}

/**
 * Whether the restaurant is currently open, in America/Caracas time.
 * Returns null when business hours are not configured.
 * Handles overnight windows (e.g. 18:00–02:00) cleanly.
 */
export function isOpenNow(
    bhInput: any,
    now: { weekday: number; minutes: number } = getNowCaracas(),
): boolean | null {
    if (!bhInput) return null;
    const bh = normalizeBusinessHours(bhInput);
    
    // Check if there are any active days configured. If all days are closed/empty, return false.
    const hasAnyActive = Object.values(bh).some(d => d.isOpen && d.intervals.length > 0);
    if (!hasAnyActive) return false;

    const { weekday, minutes } = now;

    // Check today's intervals
    const todaySchedule = bh[weekday];
    if (todaySchedule && todaySchedule.isOpen) {
        for (const interval of todaySchedule.intervals) {
            const open = parseHHMM(interval.open);
            const close = parseHHMM(interval.close);
            if (open !== null && close !== null && open !== close) {
                if (close > open) {
                    if (minutes >= open && minutes < close) return true;
                } else {
                    // Overnight window today: e.g. 18:00 to 02:00
                    if (minutes >= open) return true;
                }
            }
        }
    }

    // Check yesterday's intervals for overnight spillover
    const prevWeekday = (weekday + 6) % 7;
    const yesterdaySchedule = bh[prevWeekday];
    if (yesterdaySchedule && yesterdaySchedule.isOpen) {
        for (const interval of yesterdaySchedule.intervals) {
            const open = parseHHMM(interval.open);
            const close = parseHHMM(interval.close);
            if (open !== null && close !== null && close <= open) {
                // Yesterday had an overnight window
                if (minutes < close) return true;
            }
        }
    }

    return false;
}

export type StatusOverride = "auto" | "open" | "closed";

/**
 * Resolves the effective open state combining the manual override with the
 * automatic schedule. "open"/"closed" force the state; "auto" defers to isOpenNow.
 */
export function resolveOpenState(
    bh: any,
    override: StatusOverride | null | undefined,
    now: { weekday: number; minutes: number } = getNowCaracas(),
): boolean | null {
    if (override === "open") return true;
    if (override === "closed") return false;
    return isOpenNow(bh, now);
}

/**
 * Minutes from `now` until the next opening boundary, scanning the next 7 days.
 * Returns null when no schedule is configured. Always returns a positive number.
 */
export function minutesUntilNextOpen(
    bhInput: any,
    now: { weekday: number; minutes: number } = getNowCaracas(),
): number | null {
    if (!bhInput) return null;
    const bh = normalizeBusinessHours(bhInput);

    let minMinutes = Infinity;

    for (let k = 0; k <= 7; k++) {
        const day = (now.weekday + k) % 7;
        const sched = bh[day];
        if (!sched || !sched.isOpen) continue;
        
        for (const interval of sched.intervals) {
            const open = parseHHMM(interval.open);
            if (open === null) continue;
            
            const candidate = k * 1440 + open - now.minutes;
            if (candidate > 0 && candidate < minMinutes) {
                minMinutes = candidate;
            }
        }
    }
    return minMinutes === Infinity ? null : minMinutes;
}

/**
 * Whether the public menu should be visible right now, honoring the
 * hide-when-closed toggle, the manual status override and the pre-open
 * visibility window.
 */
export function isMenuVisible(
    bh: any,
    opts: {
        hideWhenClosed: boolean;
        preOpenMinutes: number;
        statusOverride?: StatusOverride | null;
    },
    now: { weekday: number; minutes: number } = getNowCaracas(),
): boolean {
    if (!opts.hideWhenClosed) return true;

    const open = resolveOpenState(bh, opts.statusOverride, now);
    if (open === null) return true; // no schedule configured → nothing to gate
    if (open === true) return true;

    // Forced closed ignores the pre-open window.
    if (opts.statusOverride === "closed") return false;

    const mins = minutesUntilNextOpen(bh, now);
    return mins !== null && mins <= opts.preOpenMinutes;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "09:00" → "9:00 am", "16:30" → "4:30 pm" (12-hour display format). */
function prettyTime(s: string): string {
    const m = parseHHMM(s);
    if (m === null) return s;
    const h24 = Math.floor(m / 60);
    const min = m % 60;
    const period = h24 < 12 ? "am" : "pm";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(min).padStart(2, "0")} ${period}`;
}

/**
 * Human-readable schedule derived from business hours.
 * Consolidates contiguous days with the same active schedules.
 */
export function formatBusinessHours(bhInput: any): string | null {
    if (!bhInput) return null;
    const bh = normalizeBusinessHours(bhInput);
    
    // Group days (0-6) by their schedule signature
    const scheduleSignatures: Record<string, number[]> = {};
    
    for (let i = 0; i < 7; i++) {
        const sched = bh[i];
        if (!sched.isOpen || sched.intervals.length === 0) continue;
        
        // Create a unique key for the intervals
        const sig = sched.intervals
            .map(inv => `${inv.open}-${inv.close}`)
            .sort()
            .join("|");
            
        if (!scheduleSignatures[sig]) {
            scheduleSignatures[sig] = [];
        }
        scheduleSignatures[sig].push(i);
    }
    
    const signatures = Object.keys(scheduleSignatures);
    if (signatures.length === 0) return "Cerrado";
    
    const dayGroups: string[] = [];
    
    for (const sig of signatures) {
        const days = scheduleSignatures[sig].sort((a, b) => a - b);
        const dayText = formatDayRange(days);
        
        // Format the intervals for this signature
        const intervalsText = sig
            .split("|")
            .map(part => {
                const [open, close] = part.split("-");
                return `${prettyTime(open)} – ${prettyTime(close)}`;
            })
            .join(", ");
            
        dayGroups.push(`${dayText} ${intervalsText}`);
    }
    
    return dayGroups.join(". ");
}

function formatDayRange(days: number[]): string {
    const groups: string[] = [];
    let runStart = days[0];
    let prev = days[0];
    const flush = (start: number, end: number) => {
        if (end - start >= 2) groups.push(`${DAY_LABELS[start]}–${DAY_LABELS[end]}`);
        else for (let d = start; d <= end; d++) groups.push(DAY_LABELS[d]);
    };
    for (let i = 1; i < days.length; i++) {
        if (days[i] === prev + 1) {
            prev = days[i];
        } else {
            flush(runStart, prev);
            runStart = days[i];
            prev = days[i];
        }
    }
    flush(runStart, prev);
    return groups.join(", ");
}

const FULL_DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Friendly label for the next opening.
 */
export function nextOpenLabel(
    bhInput: any,
    now: { weekday: number; minutes: number } = getNowCaracas(),
): string | null {
    if (!bhInput) return null;
    const bh = normalizeBusinessHours(bhInput);
    
    const mins = minutesUntilNextOpen(bh, now);
    if (mins === null) return null;

    const targetTotal = now.minutes + mins;
    const dayOffset = Math.floor(targetTotal / 1440);
    const targetWeekday = (now.weekday + dayOffset) % 7;
    
    // Find the specific interval that starts closest to targetTotal % 1440
    const sched = bh[targetWeekday];
    let openTime = "09:00";
    if (sched && sched.isOpen) {
        const targetMins = targetTotal % 1440;
        let minDiff = Infinity;
        for (const interval of sched.intervals) {
            const op = parseHHMM(interval.open);
            if (op !== null) {
                const diff = Math.abs(op - targetMins);
                if (diff < minDiff) {
                    minDiff = diff;
                    openTime = interval.open;
                }
            }
        }
    }
    
    const time = prettyTime(openTime);

    let when: string;
    if (dayOffset === 0) when = "hoy";
    else if (dayOffset === 1) when = "mañana";
    else when = `el ${FULL_DAYS[targetWeekday]}`;

    return `${when} a las ${time}`;
}

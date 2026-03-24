/**
 * Returns today's date string (YYYY-MM-DD) in Venezuela time (UTC-4).
 * Vercel servers run UTC; without this, dates flip at 8:00 PM VET.
 */
export function todayCaracas(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Caracas",
    }).format(new Date());
}

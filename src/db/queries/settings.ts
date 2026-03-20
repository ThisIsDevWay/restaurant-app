import { db } from "../index";
import { settings, exchangeRates } from "../schema";
import { eq } from "drizzle-orm";

let cachedSettings: typeof settings.$inferSelect | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSettings() {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const [row] = await db.select().from(settings).limit(1);
  if (row) {
    cachedSettings = row;
    cacheTimestamp = now;
  }
  return row;
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

export async function getActiveRate(): Promise<{ rate: number; fetchedAt: string } | null> {
  const s = await getSettings();
  if (!s) return null;

  if (s.rateOverrideBsPerUsd) {
    return { rate: parseFloat(s.rateOverrideBsPerUsd), fetchedAt: s.updatedAt.toISOString() };
  }

  if (!s.currentRateId) return null;

  const [rate] = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.id, s.currentRateId))
    .limit(1);

  return rate ? { rate: parseFloat(rate.rateBsPerUsd), fetchedAt: rate.fetchedAt.toISOString() } : null;
}

export async function updateSettings(data: Partial<typeof settings.$inferInsert>) {
  const [row] = await db
    .update(settings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(settings.id, 1))
    .returning();

  invalidateSettingsCache();
  return row;
}

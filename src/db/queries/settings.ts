import { db } from "../index";
import { settings, exchangeRates } from "../schema";
import { eq } from "drizzle-orm";

let cached: { data: typeof settings.$inferSelect; at: number } | null = null;

export async function getSettings() {
  if (cached && Date.now() - cached.at < 30_000) return cached.data;
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  if (row) cached = { data: row, at: Date.now() };
  return row ?? null;
}

export function invalidateSettingsCache() {
  cached = null;
}

export async function getActiveRate(): Promise<{ rate: number; fetchedAt: string; currency: string } | null> {
  const s = await getSettings();
  if (!s) return null;

  const currency = s.rateCurrency ?? "usd";

  if (s.rateOverrideBsPerUsd) {
    return { rate: parseFloat(s.rateOverrideBsPerUsd), fetchedAt: s.updatedAt.toISOString(), currency };
  }

  if (!s.currentRateId) return null;

  const [rate] = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.id, s.currentRateId))
    .limit(1);

  return rate ? { rate: parseFloat(rate.rateBsPerUsd), fetchedAt: rate.fetchedAt.toISOString(), currency } : null;
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

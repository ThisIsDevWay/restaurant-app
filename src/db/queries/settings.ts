import { db } from "../index";
import { settings, exchangeRates } from "../schema";
import { eq } from "drizzle-orm";

export async function getSettings() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  return row ?? null;
}

export function invalidateSettingsCache() {
  // No-op to preserve expected exports just in case it is imported elsewhere
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

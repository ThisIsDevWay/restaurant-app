import { db } from "../index";
import { settings, exchangeRates } from "../schema";
import { eq, desc } from "drizzle-orm";

import { unstable_cache, revalidateTag } from "next/cache";

export const getSettings = unstable_cache(
  async () => {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1);
    return row ?? null;
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 }
);

export function invalidateSettingsCache() {
  revalidateTag("settings");
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

export async function getLatestRateByCurrency(currency: string) {
  const [latestRate] = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.currency, currency))
    .orderBy(desc(exchangeRates.fetchedAt))
    .limit(1);
  return latestRate ?? null;
}

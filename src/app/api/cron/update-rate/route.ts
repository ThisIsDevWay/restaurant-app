import { NextResponse } from "next/server";
import { db } from "@/db";
import { exchangeRates, settings } from "@/db/schema";
import { invalidateSettingsCache } from "@/db/queries/settings";
import { logger } from "@/lib/logger";
import { fetchBCVRates } from "@/lib/bcv";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch both USD and EUR rates from BCV official website
    const bcvRates = await fetchBCVRates();
    const validDate = new Date().toISOString().split("T")[0];
    const results: { currency: string; rate: number | null; success: boolean }[] = [];

    // Insert USD rate
    if (bcvRates.usd) {
      const [usdRate] = await db
        .insert(exchangeRates)
        .values({
          rateBsPerUsd: bcvRates.usd.rate.toString(),
          currency: "usd",
          validDate,
          source: bcvRates.usd.source,
        })
        .returning();

      // Update settings to point to USD rate
      const s = await db.select().from(settings).limit(1);
      const currentCurrency = s[0]?.rateCurrency ?? "usd";
      if (currentCurrency === "usd") {
        await db
          .update(settings)
          .set({ currentRateId: usdRate.id, updatedAt: new Date() })
          .where(eq(settings.id, 1));
      }

      results.push({ currency: "usd", rate: bcvRates.usd.rate, success: true });
      logger.info("USD rate updated", { rate: bcvRates.usd.rate });
    }

    // Insert EUR rate
    if (bcvRates.eur) {
      const [eurRate] = await db
        .insert(exchangeRates)
        .values({
          rateBsPerUsd: bcvRates.eur.rate.toString(),
          currency: "eur",
          validDate,
          source: bcvRates.eur.source,
        })
        .returning();

      // Update settings to point to EUR rate if that's the active currency
      const s = await db.select().from(settings).limit(1);
      const currentCurrency = s[0]?.rateCurrency ?? "usd";
      if (currentCurrency === "eur") {
        await db
          .update(settings)
          .set({ currentRateId: eurRate.id, updatedAt: new Date() })
          .where(eq(settings.id, 1));
      }

      results.push({ currency: "eur", rate: bcvRates.eur.rate, success: true });
      logger.info("EUR rate updated", { rate: bcvRates.eur.rate });
    }

    // Invalidate cache
    invalidateSettingsCache();

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch any exchange rate from BCV" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      rates: results,
    });
  } catch (err) {
    logger.error("Cron update-rate error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { exchangeRates, settings } from "@/db/schema";
import { invalidateSettingsCache } from "@/db/queries/settings";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try to fetch rate from BCV or PyDolarVenezuela
    let rateValue: number | null = null;

    try {
      const response = await fetch(
        "https://pydolarve.org/api/v1/dollar?monitor=bcv",
        { next: { revalidate: 0 } },
      );
      if (response.ok) {
        const data = await response.json();
        rateValue = data?.price ?? data?.monitors?.bcv?.price ?? null;
      }
    } catch {
      logger.warn("Failed to fetch rate from PyDolarVenezuela");
    }

    if (!rateValue) {
      return NextResponse.json(
        { error: "Could not fetch exchange rate" },
        { status: 500 },
      );
    }

    // Insert new rate
    const validDate = new Date().toISOString().split("T")[0];
    const [newRate] = await db
      .insert(exchangeRates)
      .values({
        rateBsPerUsd: rateValue.toString(),
        validDate,
        source: "pydolarve",
      })
      .returning();

    // Update settings to point to new rate
    await db
      .update(settings)
      .set({
        currentRateId: newRate.id,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, 1));

    // Invalidate cache
    invalidateSettingsCache();

    logger.info("Exchange rate updated", {
      rate: rateValue,
      rateId: newRate.id,
    });

    return NextResponse.json({
      success: true,
      rate: rateValue,
      rateId: newRate.id,
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

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { expireStalePairings } from "@/lib/services/tv-pairing";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-tv-pairings
 * Marks expired pairing sessions as 'expired'. Designed to be called by
 * the same cron infrastructure as expire-orders. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const expired = await expireStalePairings();
    if (expired > 0) {
      logger.info("Expired TV pairing sessions", { count: expired });
    }
    return NextResponse.json({ expired });
  } catch (err) {
    logger.error("Cron expire-tv-pairings error", {
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, {
      extra: { context: "expire-tv-pairings-cron" },
    });
    return NextResponse.json({ expired: 0 });
  }
}

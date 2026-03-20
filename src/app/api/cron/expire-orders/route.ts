import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { expirePendingOrders } from "@/db/queries/orders";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expirePendingOrders();
    const expired =
      "rowCount" in result ? (result.rowCount as number) ?? 0 : 0;

    if (expired > 0) {
      logger.info("Expired pending orders", { count: expired });
    }

    return NextResponse.json({ expired });
  } catch (err) {
    logger.error("Cron expire-orders error", {
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { extra: { context: "expire-orders-cron" } });
    return NextResponse.json({ expired: 0 });
  }
}

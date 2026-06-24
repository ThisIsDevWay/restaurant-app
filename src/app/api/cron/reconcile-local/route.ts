import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { runReconciliationPipeline } from "@/services/payment.service";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReconciliationPipeline("local_notifications");

    if (result.matched > 0) {
      logger.info("Local notifications cron reconciliation completed", {
        matched: result.matched,
        checked: result.checked,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error("Cron reconcile-local error", {
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { extra: { context: "reconcile-local-cron" } });
    return NextResponse.json({ matched: 0, checked: 0 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}

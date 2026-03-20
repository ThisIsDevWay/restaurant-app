import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyWebhookSignature } from "@/lib/crypto";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider } from "@/lib/payment-providers";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = getIP(req);
    const { success } = await rateLimiters.paymentWebhook.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    // 1. Read raw body BEFORE parsing — HMAC verified on original string
    const rawBody = await req.text();

    // 2. Verify HMAC-SHA256
    const signature = req.headers.get("x-webhook-signature") ?? "";
    const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";

    const isValid = await verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      logger.warn("Webhook signature failed", {
        ip: req.headers.get("x-forwarded-for"),
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 3. Get active provider
    const settings = await getSettings();
    if (!settings) {
      return NextResponse.json({ outcome: "error" });
    }

    const provider = getActiveProvider(settings);

    // 4. Only passive providers handle webhooks
    if (provider.mode !== "passive") {
      return NextResponse.json({ outcome: "ignored" });
    }

    // 5. Delegate to provider
    const result = await provider.confirmPayment({
      type: "webhook_c2p",
      rawBody,
      signature,
    });

    if (result.success) {
      return NextResponse.json({ outcome: "confirmed" });
    }

    logger.warn("Webhook payment processing failed", {
      reason: result.reason,
      message: result.message,
    });

    return NextResponse.json({ outcome: result.reason });
  } catch (err) {
    logger.error("Webhook processing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    Sentry.captureException(err, { extra: { context: "payment-webhook" } });
    // Always respond 200 for business errors — bank should not retry
    return NextResponse.json({ outcome: "error" });
  }
}

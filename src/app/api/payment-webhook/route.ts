import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyWebhookSignature } from "@/lib/crypto";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { processWebhookPayload } from "@/services/payment.service";

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = getIP(req);
    const { success } = await rateLimiters.paymentWebhook.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    // 1. Read raw body BEFORE parsing
    const rawBody = await req.text();

    // 2. Verify HMAC-SHA256
    const signature = req.headers.get("x-webhook-signature") ?? "";
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    if (!secret) {
      logger.error("PAYMENT_WEBHOOK_SECRET no configurado");
      return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
    }

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

    // 3. Delegate to provider via service
    const result = await processWebhookPayload(rawBody, undefined, signature);

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
    // Responder 200 siempre para errores de negocio (idempotencia, monto incorrecto)
    // para que el banco no reintente. Solo responder 4xx/5xx para errores de infraestructura.
    return NextResponse.json({ outcome: "error" });
  }
}

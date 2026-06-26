import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankNotifications } from "@/db/schema";
import { getSettingsFresh } from "@/db/queries/settings";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { verifyDeviceToken } from "@/lib/crypto";
import { localNotificationSchema } from "@/lib/validations/webhook";
import { extractSmsFields } from "@/lib/bank-sms-parser";
import { parseBankSmsToCents, runReconciliationPipeline } from "@/services/payment.service";
import * as v from "valibot";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { eq, or, sql, and, gt } from "drizzle-orm";
import { parseReceiveTime } from "./utils";

export async function POST(req: Request) {
  try {
    const ip = getIP(req);
    const { success: rateOk } = await rateLimiters.paymentWebhook.limit(ip);
    if (!rateOk) return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });

    // Carga de configuración usando getSettingsFresh para evitar stale cache
    const settingsData = await getSettingsFresh();
    const serverToken = settingsData?.localDeviceToken || process.env.LOCAL_DEVICE_TOKEN;
    const tokenHeader = req.headers.get("X-Device-Token") || "";

    if (!serverToken || !verifyDeviceToken(tokenHeader, serverToken)) {
      logger.warn("Dispositivo no autorizado intentando conectar al webhook", { ip });
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const json = await req.json();
    const result = v.safeParse(localNotificationSchema, json);
    if (!result.success) return NextResponse.json({ error: "Estructura inválida" }, { status: 400 });

    const { sender, message, source, receiveTime } = result.output;
    const parsed = extractSmsFields(sender, message);
    
    if (!parsed) {
      logger.error("Error al estructurar el SMS bancario", { message });
      await db.insert(bankNotifications).values({
        source: source === "app_notification" ? "local_app" : "local_sms",
        sender, message, amountRaw: "", amountBsCents: 0,
        reference: "FAILED_" + Date.now(), status: "failed", rawPayload: json
      });
      return NextResponse.json({ error: "Error de parsing" }, { status: 422 });
    }

    const { amountRaw, reference, phone, document } = parsed;
    const cleanRef = reference.trim();

    // Check SMS Age if receiveTime is provided
    if (receiveTime) {
      const smsDate = parseReceiveTime(receiveTime);
      if (!smsDate) {
        logger.error("Fecha de receiveTime no pudo ser parseada", { receiveTime });
        return NextResponse.json({ error: "Fecha de receiveTime inválida" }, { status: 400 });
      }
      const ageMinutes = Math.abs(Date.now() - smsDate.getTime()) / 1000 / 60;
      if (ageMinutes > 60) {
        logger.warn("SMS descartado por antigüedad", { receiveTime, ageMinutes, reference: cleanRef });
        const amountCents = parseBankSmsToCents(amountRaw);
        await db.insert(bankNotifications).values({
          source: source === "app_notification" ? "local_app" : "local_sms",
          sender, message, amountRaw, amountBsCents: amountCents,
          reference: "FAILED_OLD_" + Date.now(), 
          senderPhone: phone || null,
          senderDocument: document || null,
          status: "failed", rawPayload: json
        });
        return NextResponse.json({ error: "SMS muy antiguo" }, { status: 400 });
      }
    }

    // Idempotencia por referencia completa (limitada a las últimas 48 horas para rendimiento)
    const [existing] = await db
      .select()
      .from(bankNotifications)
      .where(
        and(
          gt(bankNotifications.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
          eq(bankNotifications.reference, cleanRef)
        )
      )
      .limit(1);
    if (existing) return NextResponse.json({ success: true, duplicated: true });

    // Guardar notificación
    const amountCents = parseBankSmsToCents(amountRaw);
    await db.insert(bankNotifications).values({
      source: source === "app_notification" ? "local_app" : "local_sms",
      sender, message, amountRaw, amountBsCents: amountCents,
      reference: cleanRef, 
      senderPhone: phone || null, 
      senderDocument: document || null,
      status: "pending", 
      rawPayload: json
    });

    // Ejecutar pipeline
    const pipeline = await runReconciliationPipeline("local_notifications");

    return NextResponse.json({ success: true, matched: pipeline.matched > 0 });
  } catch (error: any) {
    logger.error("Fallo crítico en local-notifications", { error: error.message });
    Sentry.captureException(error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

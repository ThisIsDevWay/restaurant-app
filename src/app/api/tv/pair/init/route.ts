import { NextResponse } from "next/server";
import { db } from "@/db";
import { tvPairingSessions } from "@/db/schema";
import { PAIRING_TTL_MS, expireStalePairings, generatePairingCode } from "@/lib/services/tv-pairing";
import { rateLimiters, getIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/tv/pair/init
 * Public endpoint called by the TV browser when it has no display token.
 * Generates a fresh 4-digit pairing code valid for 5 minutes.
 *
 * Body (optional): { deviceFingerprint?: string }
 */
export async function POST(req: Request) {
  const ip = getIP(req);
  const { success } = await rateLimiters.tvPairInit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intente más tarde." },
      { status: 429 },
    );
  }

  let deviceFingerprint: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      deviceFingerprint?: string;
    };
    if (typeof body.deviceFingerprint === "string") {
      deviceFingerprint = body.deviceFingerprint.slice(0, 200);
    }
  } catch {
    // ignore - body is optional
  }

  // Opportunistically clean up expired sessions so codes free up for reuse.
  await expireStalePairings();

  try {
    const code = await generatePairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

    const [session] = await db
      .insert(tvPairingSessions)
      .values({
        pairingCode: code,
        status: "pending",
        deviceFingerprint: deviceFingerprint ?? null,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      pairingCode: session.pairingCode,
      expiresAt: session.expiresAt.toISOString(),
      sessionId: session.id,
    });
  } catch (err) {
    logger.error("TV pair init failed", { err });
    return NextResponse.json(
      { error: "No se pudo generar el código. Intenta de nuevo." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { tvPairingSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { rateLimiters, getIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/tv/pair/check?code=AB3X7Q
 * Public endpoint polled by the TV every ~3 seconds while waiting to be paired.
 * Returns the current status of the pairing session.
 *
 * Status values:
 *   - "pending":  no admin has validated yet
 *   - "linked":   admin validated; finalAccessToken is included
 *   - "expired":  the session timed out without validation
 *   - "not_found": no such code exists
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success } = await rateLimiters.tvPairCheck.limit(ip);
  if (!success) {
    return NextResponse.json({ status: "not_found" as const }, { status: 429 });
  }

  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim().toUpperCase();

  if (!/^[A-Z2-9]{6}$/.test(code)) {
    return NextResponse.json(
      { status: "not_found" as const },
      { status: 200 },
    );
  }

  // Most recent session for this code (codes can be reused after expiry).
  const [session] = await db
    .select()
    .from(tvPairingSessions)
    .where(eq(tvPairingSessions.pairingCode, code))
    .orderBy(desc(tvPairingSessions.createdAt))
    .limit(1);

  if (!session) {
    return NextResponse.json({ status: "not_found" as const });
  }

  // Linked: hand back the token. Auto-clean status string so the client just
  // checks "linked" and uses finalAccessToken.
  if (session.status === "linked" && session.finalAccessToken) {
    return NextResponse.json({
      status: "linked" as const,
      displayToken: session.finalAccessToken,
      displayId: session.linkedDisplayId,
    });
  }

  // Expired (either by status or by clock).
  if (
    session.status === "expired" ||
    session.expiresAt.getTime() < Date.now()
  ) {
    // Best-effort flip to expired so future lookups are cheap.
    if (session.status === "pending") {
      await db
        .update(tvPairingSessions)
        .set({ status: "expired" })
        .where(eq(tvPairingSessions.id, session.id));
    }
    return NextResponse.json({ status: "expired" as const });
  }

  return NextResponse.json({
    status: "pending" as const,
    expiresAt: session.expiresAt.toISOString(),
  });
}

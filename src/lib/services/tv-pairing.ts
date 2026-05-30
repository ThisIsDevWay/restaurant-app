import crypto from "crypto";
import { db } from "@/db";
import { tvPairingSessions, tvDisplays } from "@/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";

export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const DISPLAY_TOKEN_PREFIX = "tv_";

// Alphanumeric charset excluding visually ambiguous characters (0, 1, I, O)
const PAIRING_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a unique 4-digit numeric pairing code that
 * doesn't collide with any currently-pending session. Up to 10 retries, then throws.
 */
export async function generatePairingCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: PAIRING_CODE_LENGTH }, () =>
      PAIRING_CHARS[Math.floor(Math.random() * PAIRING_CHARS.length)],
    ).join("");

    const existing = await db
      .select({ id: tvPairingSessions.id })
      .from(tvPairingSessions)
      .where(
        and(
          eq(tvPairingSessions.pairingCode, code),
          eq(tvPairingSessions.status, "pending"),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return code;
    }
  }
  throw new Error("No se pudo generar un código de emparejamiento único");
}

/**
 * Generates a secure persistent display token. The TV stores this in
 * localStorage and presents it in every subsequent /api/tv/content request.
 */
export function generateDisplayToken(): string {
  const random = crypto.randomBytes(16).toString("hex");
  return `${DISPLAY_TOKEN_PREFIX}${random}`;
}

/**
 * Marks expired pending sessions as 'expired'. Safe to call on every poll
 * as well as from the cron job.
 */
export async function expireStalePairings(): Promise<number> {
  const result = await db
    .update(tvPairingSessions)
    .set({ status: "expired" })
    .where(
      and(
        eq(tvPairingSessions.status, "pending"),
        lt(tvPairingSessions.expiresAt, new Date()),
      ),
    );
  // postgres-js returns count under different shapes; coalesce to number
  const rowCount =
    (result as { rowCount?: number; count?: number }).rowCount ??
    (result as { count?: number }).count ??
    0;
  return rowCount;
}

/**
 * Atomic validation of a pairing code by an admin. Creates a new tvDisplay
 * row, updates the session to 'linked', and returns the new display + token.
 *
 * Uses a single UPDATE with WHERE status='pending' to prevent two admins
 * from validating the same code simultaneously.
 */
export async function validatePairingCode(params: {
  code: string;
  displayName: string;
  validatedByUserId: string;
}): Promise<
  | {
      ok: true;
      displayId: string;
      displayToken: string;
      displayName: string;
    }
  | { ok: false; reason: "not_found" | "expired" | "already_linked" }
> {
  const { code, displayName, validatedByUserId } = params;

  // Read current session state.
  const [session] = await db
    .select()
    .from(tvPairingSessions)
    .where(eq(tvPairingSessions.pairingCode, code))
    .orderBy(sql`${tvPairingSessions.createdAt} DESC`)
    .limit(1);

  if (!session) return { ok: false, reason: "not_found" };
  if (session.status === "linked")
    return { ok: false, reason: "already_linked" };
  if (
    session.status === "expired" ||
    session.expiresAt.getTime() < Date.now()
  ) {
    return { ok: false, reason: "expired" };
  }

  // Create the display first.
  const displayToken = generateDisplayToken();
  const [display] = await db
    .insert(tvDisplays)
    .values({
      name: displayName.trim() || "TV sin nombre",
      displayToken,
      linkedByUserId: validatedByUserId,
      lastSeenAt: new Date(),
    })
    .returning();

  // Atomic claim of the session: update only if still pending.
  const updated = await db
    .update(tvPairingSessions)
    .set({
      status: "linked",
      linkedDisplayId: display.id,
      finalAccessToken: displayToken,
      validatedByUserId,
      validatedAt: new Date(),
    })
    .where(
      and(
        eq(tvPairingSessions.id, session.id),
        eq(tvPairingSessions.status, "pending"),
      ),
    )
    .returning();

  if (updated.length === 0) {
    // Lost the race: another admin already linked this session.
    // Roll back the display we just created to avoid orphans.
    await db.delete(tvDisplays).where(eq(tvDisplays.id, display.id));
    return { ok: false, reason: "already_linked" };
  }

  return {
    ok: true,
    displayId: display.id,
    displayToken,
    displayName: display.name,
  };
}

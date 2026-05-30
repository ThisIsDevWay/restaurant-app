import { NextResponse } from "next/server";
import {
  findActiveDisplayByToken,
  resolveContentForDisplay,
  updateDisplayHeartbeat,
} from "@/lib/services/tv-content";
import { getSettings } from "@/db/queries/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/tv/content?token=tv_xxx&orientation=portrait&size=1920x1080
 * Served to the TV browser on mount and on Realtime/timer triggers.
 *
 * Auth: token via query string OR `Authorization: Bearer <token>` header.
 *
 * ETag based on playlist.version:
 *   - TV sends `If-None-Match: "<version>"` on subsequent calls.
 *   - 304 returned when unchanged → no body transmitted, heartbeat still updated.
 *
 * Heartbeat throttle: updateDisplayHeartbeat skips the DB write if a heartbeat
 * was already recorded within the last 60 s (uses lastSeenAt already fetched by
 * findActiveDisplayByToken — no extra query needed).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  let token = (url.searchParams.get("token") ?? "").trim();
  if (!token) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth.toLowerCase().startsWith("bearer ")) {
      token = auth.slice(7).trim();
    }
  }
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const display = await findActiveDisplayByToken(token);
  if (!display) {
    // 403 signals to the TV client that it should clear localStorage and
    // return to the pairing screen.
    return NextResponse.json({ error: "revoked_or_invalid" }, { status: 403 });
  }

  const reportedOrientation = url.searchParams.get("orientation");
  const reportedSize = url.searchParams.get("size");

  // Throttled heartbeat — passes current lastSeenAt so the service can skip
  // the UPDATE if one was already written in the last 60 s.
  void updateDisplayHeartbeat({
    displayId: display.id,
    currentLastSeenAt: display.lastSeenAt,
    reportedOrientation: reportedOrientation
      ? reportedOrientation.slice(0, 32)
      : null,
    reportedSize: reportedSize ? reportedSize.slice(0, 32) : null,
  });

  const [playlist, settings] = await Promise.all([
    resolveContentForDisplay(display.id),
    getSettings(),
  ]);

  // ETag covers both playlist content AND display config fields so that a
  // config-only change (orientation, audio, rotation) also triggers a 200.
  const configSig = [
    display.orientation,
    display.rotationDegrees,
    display.audioEnabled ? "1" : "0",
    display.volumePercent,
    display.name,
  ].join(":");
  const etag = `"${playlist.version}-${Buffer.from(configSig).toString("base64url").slice(0, 8)}"`;
  const ifNoneMatch = req.headers.get("if-none-match");

  if (ifNoneMatch === etag) {
    // Content and config unchanged — skip sending the body
    return new Response(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return NextResponse.json(
    {
      displayId: display.id,
      name: display.name,
      orientation: display.orientation,
      rotationDegrees: display.rotationDegrees,
      audioEnabled: display.audioEnabled,
      volumePercent: display.volumePercent,
      source: playlist.source,
      eventId: playlist.eventId,
      eventName: playlist.eventName,
      items: playlist.items,
      version: playlist.version,
      restaurantName: settings?.restaurantName ?? null,
      logoUrl: settings?.logoUrl ?? null,
    },
    { headers: { ETag: etag, "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import {
  findActiveDisplayByToken,
  resolveContentForDisplay,
  updateDisplayHeartbeat,
} from "@/lib/services/tv-content";

export const dynamic = "force-dynamic";

/**
 * GET /api/tv/content?token=tv_xxx&orientation=portrait&size=1920x1080
 * Public endpoint polled by the TV every ~5 seconds.
 *
 * Auth: token via query string OR `Authorization: Bearer <token>` header.
 *
 * Response includes a `version` hash so the TV can skip re-rendering the
 * carousel when nothing has actually changed.
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

  // Heartbeat (best-effort, async-fire-and-forget would also work here).
  await updateDisplayHeartbeat({
    displayId: display.id,
    reportedOrientation: reportedOrientation
      ? reportedOrientation.slice(0, 32)
      : null,
    reportedSize: reportedSize ? reportedSize.slice(0, 32) : null,
  });

  const playlist = await resolveContentForDisplay(display.id);

  return NextResponse.json({
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
  });
}

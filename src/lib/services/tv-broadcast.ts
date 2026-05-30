/**
 * Server-side helper to send a Supabase Realtime Broadcast from a Server Action.
 *
 * Uses the Realtime REST API instead of a WebSocket — safe for serverless because
 * it's a single HTTP POST with no persistent connection overhead.
 *
 * Zero WAL: Broadcast does not touch any DB table, so it generates no Realtime
 * egress from postgres_changes. The message travels only over the WebSocket the
 * TV client already has open.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Broadcasts a `config_change` event on the TV display's content channel.
 * The TvController will receive it and call pollContent immediately.
 *
 * Fire-and-forget: errors are logged but never thrown so they don't fail the
 * parent Server Action.
 */
export async function broadcastTvConfigChange(
  displayId: string,
): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      // Supabase Realtime Broadcast REST API format:
      // outer `event` must be "broadcast" (protocol type);
      // the user-defined event name goes inside payload.event.
      body: JSON.stringify({
        messages: [
          {
            topic: `realtime:tv-content-${displayId}`,
            event: "broadcast",
            payload: {
              type: "broadcast",
              event: "config_change",
              payload: { displayId },
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(
        `[tv-broadcast] Broadcast failed for display ${displayId}: ${res.status}`,
      );
    }
  } catch (err) {
    console.error("[tv-broadcast] Broadcast error:", err);
  }
}

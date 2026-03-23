const BASE_URL = process.env.WHATSAPP_MICROSERVICE_URL ?? "http://38.171.255.120:3333";

export interface WhatsAppStatus {
  status: "connected" | "disconnected" | "connecting";
  qr?: string;
}

export async function getStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${BASE_URL}/status`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: "disconnected" };
    return res.json();
  } catch {
    return { status: "disconnected" };
  }
}

export async function sendMessage(
  number: string,
  message: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, message }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error ?? "Failed to send" };
    }

    const data = await res.json();
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Network error" };
  }
}

export async function getQR(): Promise<string | null> {
  const status = await getStatus();
  return status.qr ?? null;
}

export async function forceReconnect(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/force-reconnect`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

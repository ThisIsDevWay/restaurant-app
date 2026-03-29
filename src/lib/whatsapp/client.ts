const BASE_URL = process.env.WHATSAPP_MICROSERVICE_URL ?? "";

export interface WhatsAppStatus {
  status: "connected" | "disconnected" | "connecting";
  qr?: string;
}

export async function getStatus(baseUrl?: string): Promise<WhatsAppStatus> {
  const url = baseUrl || BASE_URL;
  try {
    const res = await fetch(`${url}/status`, {
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
  baseUrl?: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const url = baseUrl || BASE_URL;
  try {
    const res = await fetch(`${url}/send-message`, {
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

export async function getQR(baseUrl?: string): Promise<string | null> {
  const status = await getStatus(baseUrl);
  return status.qr ?? null;
}

export async function forceReconnect(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || BASE_URL;
  try {
    const res = await fetch(`${url}/force-reconnect`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

import type { GpsCoords } from "@/components/public/checkout/CheckoutForm.types";

interface AppendParams {
    /** Mensaje base generado por el servidor vía buildOrderMessage() */
    serverMessage: string;
    /** URL pública del comprobante subido a Supabase Storage */
    comprobanteUrl: string;
    /** Coordenadas GPS si el usuario las otorgó (solo para delivery) */
    gpsCoords: GpsCoords | null;
}

/**
 * Toma el prefilledMessage del servidor y le anexa:
 * 1. Link de Google Maps (si hay GPS)
 * 2. URL del comprobante de pago
 *
 * Respeta el sistema de templates del servidor (commit d4db5f5).
 * No reconstruye el mensaje — solo añade lo que el servidor no conoce.
 */
export function appendComprobanteToMessage({
    serverMessage,
    comprobanteUrl,
    gpsCoords,
}: AppendParams): string {
    const lines: string[] = [serverMessage];

    // Añadir link de Maps solo si hay GPS (el servidor ya incluyó la dirección de texto)
    if (gpsCoords) {
        const mapsUrl = `https://maps.google.com/?q=${gpsCoords.lat.toFixed(6)},${gpsCoords.lng.toFixed(6)}`;
        lines.push("");
        lines.push(`📍 *Ubicación GPS:* ${mapsUrl}`);
        lines.push(`_(precisión: ±${Math.round(gpsCoords.accuracy)}m)_`);
    }

    // Añadir comprobante siempre
    lines.push("");
    lines.push("─────────────────────");
    lines.push("*📎 COMPROBANTE DE PAGO:*");
    lines.push(comprobanteUrl);

    return lines.join("\n");
}

/**
 * Extrae el número de WhatsApp del waLink del servidor y construye
 * un nuevo wa.me link con el mensaje final (que incluye el comprobante).
 *
 * El servidor ya sanitizó el número (e.g. "https://wa.me/584141234567?text=...").
 * Solo necesitamos extraer el número y re-encodear el nuevo mensaje.
 */
export function buildFinalWaLink(serverWaLink: string, finalMessage: string): string {
    // Extraer número del link del servidor: "https://wa.me/584141234567?text=..."
    const match = serverWaLink.match(/wa\.me\/(\d+)/);
    const number = match?.[1] ?? "";
    return `https://wa.me/${number}?text=${encodeURIComponent(finalMessage)}`;
}

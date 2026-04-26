import QRCode from "qrcode";

/**
 * Generates a PNG Data URL for a given text.
 * Suitable for <img> tags in the browser or server-side rendering.
 */
export async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#1C0A00", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates a PNG Buffer for a given text.
 * Suitable for API responses and file downloads.
 */
export async function generateQRBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: 600,
    margin: 3,
    color: { dark: "#1C0A00", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });
}

/**
 * Builds the full URL for a table QR code.
 */
export function buildTableQRUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/m/${token}`;
}

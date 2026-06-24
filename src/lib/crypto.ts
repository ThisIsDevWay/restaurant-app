import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify HMAC-SHA256 webhook signature.
 * Returns false on any failure (never throws).
 * Uses timingSafeEqual to prevent timing attacks.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

    const expectedBuffer = Buffer.from(expected, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Compara dos tokens de dispositivo de forma segura contra ataques de temporización.
 */
export function verifyDeviceToken(received: string, expected: string): boolean {
  try {
    const receivedBuffer = Buffer.from(received, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(receivedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}


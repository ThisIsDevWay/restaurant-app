import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyWebhookSignature } from "@/lib/crypto";

function createSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const secret = "test-secret-key";
  const body = JSON.stringify({ amount: 15.03, reference: "REF123" });

  it("returns true for valid signature", async () => {
    const signature = createSignature(body, secret);
    const result = await verifyWebhookSignature(body, signature, secret);
    expect(result).toBe(true);
  });

  it("returns false for invalid signature", async () => {
    const result = await verifyWebhookSignature(
      body,
      "invalid-signature-here",
      secret,
    );
    expect(result).toBe(false);
  });

  it("returns false for signature with different length", async () => {
    const result = await verifyWebhookSignature(body, "short", secret);
    expect(result).toBe(false);
  });

  it("returns false for wrong secret", async () => {
    const signature = createSignature(body, secret);
    const result = await verifyWebhookSignature(
      body,
      signature,
      "wrong-secret",
    );
    expect(result).toBe(false);
  });

  it("returns false for tampered body", async () => {
    const signature = createSignature(body, secret);
    const result = await verifyWebhookSignature(
      body + "tampered",
      signature,
      secret,
    );
    expect(result).toBe(false);
  });

  it("returns false for empty signature", async () => {
    const result = await verifyWebhookSignature(body, "", secret);
    expect(result).toBe(false);
  });

  it("does not throw on any input", async () => {
    await expect(
      verifyWebhookSignature("", "", ""),
    ).resolves.toBe(false);
    await expect(
      verifyWebhookSignature(body, "not-hex", secret),
    ).resolves.toBe(false);
  });
});

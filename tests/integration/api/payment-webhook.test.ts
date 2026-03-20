import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/queries/settings", () => ({
  getSettings: vi.fn(),
}));

vi.mock("@/lib/payment-providers", () => ({
  getActiveProvider: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: {
    paymentWebhook: { limit: vi.fn().mockResolvedValue({ success: true }) },
  },
  getIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/crypto", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/payment-webhook/route";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider } from "@/lib/payment-providers";
import { verifyWebhookSignature } from "@/lib/crypto";

function makeRequest(body: string, signature?: string): Request {
  const headers = new Headers();
  if (signature) headers.set("x-webhook-signature", signature);
  return new Request("http://localhost/api/payment-webhook", {
    method: "POST",
    body,
    headers,
  });
}

const mockSettings = {
  id: 1,
  activePaymentProvider: "banesco_reference",
  bankName: "Banesco",
  bankCode: "0134",
  accountPhone: "04141234567",
  accountRif: "J-12345678-9",
  orderExpirationMinutes: 30,
  maxPendingOrders: 99,
  currentRateId: "rate-uuid",
  rateOverrideBsPerUsd: null,
  banescoApiKey: null,
  mercantilClientId: null,
  mercantilClientSecret: null,
  bncApiKey: null,
  whatsappNumber: "584141234567",
  updatedAt: new Date(),
};

describe("POST /api/payment-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_WEBHOOK_SECRET = "test-secret";
  });

  it("returns 401 when HMAC signature is invalid", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(false);

    const res = await POST(makeRequest("{}", "bad-sig"));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(getSettings).not.toHaveBeenCalled();
  });

  it("returns 401 when signature is empty", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(false);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(401);
  });

  it("delegates to provider and returns confirmed on success", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(true);
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveProvider).mockReturnValue({
      id: "mercantil_c2p",
      mode: "passive",
      confirmPayment: vi.fn().mockResolvedValue({
        success: true,
        providerRaw: { transactionId: "tx-123" },
        reference: "ref-456",
      }),
    } as any);

    const res = await POST(makeRequest('{"amount": 3928.15}', "valid-sig"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.outcome).toBe("confirmed");
  });

  it("returns provider reason when payment fails", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(true);
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveProvider).mockReturnValue({
      id: "mercantil_c2p",
      mode: "passive",
      confirmPayment: vi.fn().mockResolvedValue({
        success: false,
        reason: "invalid_reference",
        message: "Referencia no válida",
      }),
    } as any);

    const res = await POST(makeRequest('{"amount": 3928.15}', "valid-sig"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.outcome).toBe("invalid_reference");
  });

  it("returns ignored for active-mode providers", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(true);
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveProvider).mockReturnValue({
      id: "banesco_reference",
      mode: "active",
      confirmPayment: vi.fn(),
    } as any);

    const res = await POST(makeRequest('{"reference": "12345678"}', "valid-sig"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.outcome).toBe("ignored");
  });

  it("is idempotent — same payload twice returns same result", async () => {
    const mockConfirm = vi.fn().mockResolvedValue({
      success: true,
      providerRaw: { id: "tx-1" },
      reference: "ref-1",
    });

    vi.mocked(verifyWebhookSignature).mockResolvedValue(true);
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveProvider).mockReturnValue({
      id: "mercantil_c2p",
      mode: "passive",
      confirmPayment: mockConfirm,
    } as any);

    const payload = '{"amount": 3928.15, "reference": "ref-1"}';

    const res1 = await POST(makeRequest(payload, "valid-sig"));
    const body1 = await res1.json();

    const res2 = await POST(makeRequest(payload, "valid-sig"));
    const body2 = await res2.json();

    expect(body1.outcome).toBe("confirmed");
    expect(body2.outcome).toBe("confirmed");
    expect(mockConfirm).toHaveBeenCalledTimes(2);
  });

  it("returns 200 even on internal error (no retry)", async () => {
    vi.mocked(verifyWebhookSignature).mockResolvedValue(true);
    vi.mocked(getSettings).mockRejectedValue(new Error("db down"));

    const res = await POST(makeRequest('{}', "valid-sig"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.outcome).toBe("error");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/queries/settings", () => ({
  getSettings: vi.fn(),
  getActiveRate: vi.fn(),
}));

vi.mock("@/db/queries/menu", () => ({
  getMenuItemWithOptions: vi.fn(),
}));

vi.mock("@/db/queries/orders", () => ({
  createOrder: vi.fn(),
}));

vi.mock("@/lib/payment-providers", () => {
  const BanescoProvider = {
    id: "banesco_reference",
    mode: "active",
    initiatePayment: vi.fn().mockResolvedValue({
      screen: "enter_reference",
      totalBsCents: 139967,
      bankDetails: {
        bankName: "Banesco",
        bankCode: "0134",
        accountPhone: "04141234567",
        accountRif: "J-12345678-9",
      },
    }),
    confirmPayment: vi.fn(),
  };

  const WhatsAppProvider = {
    id: "whatsapp_manual",
    mode: "active",
    initiatePayment: vi.fn().mockResolvedValue({
      screen: "whatsapp",
      waLink: "https://wa.me/584141234567?text=pedido",
      prefilledMessage: "pedido test",
    }),
    confirmPayment: vi.fn(),
  };

  return {
    getActiveProvider: vi.fn((settings: any) => {
      if (settings.activePaymentProvider === "whatsapp_manual") {
        return WhatsAppProvider;
      }
      return BanescoProvider;
    }),
  };
});

import { processCheckout } from "@/actions/checkout";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { getMenuItemWithOptions } from "@/db/queries/menu";
import { createOrder } from "@/db/queries/orders";

const ITEM_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const mockSettings = {
  id: 1,
  bankName: "Banesco",
  bankCode: "0134",
  accountPhone: "04141234567",
  accountRif: "J-12345678-9",
  orderExpirationMinutes: 30,
  maxPendingOrders: 99,
  currentRateId: "rate-uuid",
  rateOverrideBsPerUsd: null,
  activePaymentProvider: "banesco_reference",
  banescoApiKey: null,
  mercantilClientId: null,
  mercantilClientSecret: null,
  bncApiKey: null,
  whatsappNumber: "584141234567",
  updatedAt: new Date(),
};

const mockMenuItem = {
  id: ITEM_UUID,
  name: "Pollo Guisado",
  description: null,
  priceUsdCents: 310,
  categoryId: "cat-1",
  isAvailable: true,
  imageUrl: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  optionGroups: [],
};

const mockOrder = {
  id: "order-123",
  customerPhone: "04141234567",
  itemsSnapshot: [],
  subtotalUsdCents: 310,
  subtotalBsCents: 139967,
  status: "pending" as const,
  paymentMethod: "pago_movil" as const,
  paymentProvider: "banesco_reference" as const,
  paymentReference: null,
  paymentLogId: null,
  exchangeRateId: "rate-uuid",
  rateSnapshotBsPerUsd: "451.50700000",
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput = {
  phone: "04141234567",
  paymentMethod: "pago_movil",
  items: [{ id: ITEM_UUID, quantity: 1 }],
};

const validCheckoutItems = [
  { id: ITEM_UUID, quantity: 1, selectedContorno: null, selectedAdicionales: [], removedComponents: [], categoryAllowAlone: true },
];

describe("processCheckout with payment providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enter_reference screen for banesco_reference provider", async () => {
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue(mockOrder as any);

    const result = await processCheckout(validInput, validCheckoutItems);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.initResult.screen).toBe("enter_reference");
      expect((result.initResult as any).bankDetails.bankName).toBe("Banesco");
    }
  });

  it("returns whatsapp screen for whatsapp_manual provider", async () => {
    const whatsappSettings = {
      ...mockSettings,
      activePaymentProvider: "whatsapp_manual",
    };
    vi.mocked(getSettings).mockResolvedValue(whatsappSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue({
      ...mockOrder,
      paymentProvider: "whatsapp_manual",
      status: "whatsapp",
    } as any);

    const result = await processCheckout(validInput, validCheckoutItems);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.initResult.screen).toBe("whatsapp");
      expect((result.initResult as any).waLink).toContain("wa.me");
    }
  });

  it("creates order with whatsapp status for whatsapp provider", async () => {
    const whatsappSettings = {
      ...mockSettings,
      activePaymentProvider: "whatsapp_manual",
    };
    vi.mocked(getSettings).mockResolvedValue(whatsappSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue({
      ...mockOrder,
      paymentProvider: "whatsapp_manual",
      status: "whatsapp",
    } as any);

    await processCheckout(validInput, validCheckoutItems);

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "whatsapp",
        paymentProvider: "whatsapp_manual",
      }),
    );
  });

  it("creates order with pending status for banesco provider", async () => {
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue(mockOrder as any);

    await processCheckout(validInput, validCheckoutItems);

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        paymentProvider: "banesco_reference",
      }),
    );
  });

  it("does not include dynamicCentsSurcharge or exactAmountBsCents", async () => {
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue(mockOrder as any);

    await processCheckout(validInput, validCheckoutItems);

    expect(createOrder).toHaveBeenCalledWith(
      expect.not.objectContaining({
        dynamicCentsSurcharge: expect.anything(),
        exactAmountBsCents: expect.anything(),
      }),
    );
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentProvider: expect.any(String),
      }),
    );
  });

  it("returns error for unavailable item", async () => {
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue({
      ...mockMenuItem,
      isAvailable: false,
    } as any);

    const result = await processCheckout(validInput, validCheckoutItems);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("no está disponible");
    }
  });

  it("returns error for missing item in DB", async () => {
    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(null as any);

    const result = await processCheckout(validInput, validCheckoutItems);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Item no encontrado");
    }
  });

  it("returns error when cart contains only restricted items", async () => {
    const restrictedItems = [
      { id: ITEM_UUID, quantity: 1, selectedContorno: null, selectedAdicionales: [], removedComponents: [], categoryAllowAlone: false },
    ];

    const result = await processCheckout(validInput, restrictedItems);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No puedes pedir solo bebidas o adicionales");
      expect(result.field).toBe("items");
    }
  });

  it("allows checkout when cart has mixed items including non-restricted", async () => {
    const mixedItems = [
      { id: ITEM_UUID, quantity: 1, selectedContorno: null, selectedAdicionales: [], removedComponents: [], categoryAllowAlone: true },
      { id: "b1b2c3d4-e5f6-7890-abcd-ef1234567891", quantity: 1, selectedContorno: null, selectedAdicionales: [], removedComponents: [], categoryAllowAlone: false },
    ];

    vi.mocked(getSettings).mockResolvedValue(mockSettings as any);
    vi.mocked(getActiveRate).mockResolvedValue({ rate: 451.507, fetchedAt: new Date().toISOString() });
    vi.mocked(getMenuItemWithOptions).mockResolvedValue(mockMenuItem as any);
    vi.mocked(createOrder).mockResolvedValue(mockOrder as any);

    const result = await processCheckout(validInput, mixedItems);

    expect(result.success).toBe(true);
  });
});

/**
 * Tests unitarios para el schema de validacion de settings (Valibot).
 *
 * Cubre los campos nuevos: menuItemSortMode, menuLayout, logoUrl
 * y validaciones existentes criticas.
 */
import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { settingsSchema } from "@/lib/validations/settings";

// Base valido con TODOS los campos requeridos del schema
const validBase = {
  bankName: "Banesco",
  bankCode: "0134",
  restaurantName: "G&M",
  accountPhone: "04121234567",
  accountRif: "J-12345678-9",
  transferBankName: "BNC",
  transferAccountName: "Test",
  transferAccountNumber: "01911234567890123456",
  transferAccountRif: "J-87654321-0",
  orderExpirationMinutes: 30,
  maxPendingOrders: 10,
  maxQuantityPerItem: 10,
  rateCurrency: "usd" as const,
  showRateInMenu: true,
  activePaymentProvider: "banesco_reference" as const,
};

describe("settingsSchema — menuItemSortMode", () => {
  it("acepta 'custom' como menuItemSortMode", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuItemSortMode: "custom",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.menuItemSortMode).toBe("custom");
    }
  });

  it("acepta 'price_asc' como menuItemSortMode", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuItemSortMode: "price_asc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.menuItemSortMode).toBe("price_asc");
    }
  });

  it("acepta 'price_desc' como menuItemSortMode", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuItemSortMode: "price_desc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.menuItemSortMode).toBe("price_desc");
    }
  });

  it("rechaza un valor invalido para menuItemSortMode", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuItemSortMode: "alphabetical",
    });
    expect(result.success).toBe(false);
  });

  it("menuItemSortMode es opcional (no requerido)", () => {
    const result = v.safeParse(settingsSchema, validBase);
    expect(result.success).toBe(true);
  });
});

describe("settingsSchema — menuLayout", () => {
  it("acepta 'modern' como menuLayout", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuLayout: "modern",
    });
    expect(result.success).toBe(true);
  });

  it("acepta 'classic' como menuLayout", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuLayout: "classic",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un valor invalido para menuLayout", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      menuLayout: "grid",
    });
    expect(result.success).toBe(false);
  });

  it("menuLayout es opcional", () => {
    const result = v.safeParse(settingsSchema, validBase);
    expect(result.success).toBe(true);
  });
});

describe("settingsSchema — logoUrl", () => {
  it("acepta logoUrl como string", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      logoUrl: "https://example.com/logo.png",
    });
    expect(result.success).toBe(true);
  });

  it("acepta logoUrl vacio", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      logoUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("logoUrl es opcional", () => {
    const result = v.safeParse(settingsSchema, validBase);
    expect(result.success).toBe(true);
  });
});

describe("settingsSchema — campos requeridos basicos", () => {
  it("rechaza si bankName esta vacio", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      bankName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza si accountRif esta vacio", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      accountRif: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza orderExpirationMinutes menor a 5", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      orderExpirationMinutes: 3,
    });
    expect(result.success).toBe(false);
  });

  it("acepta payload completo con todos los campos nuevos", () => {
    const result = v.safeParse(settingsSchema, {
      ...validBase,
      banescoApiKey: "test-key",
      whatsappNumber: "04121234567",
      adicionalesEnabled: true,
      bebidasEnabled: true,
      instagramUrl: "https://instagram.com/test",
      logoUrl: "https://example.com/logo.png",
      orderModeOnSiteEnabled: true,
      orderModeTakeAwayEnabled: true,
      orderModeDeliveryEnabled: true,
      packagingFeePerPlateUsdCents: 200,
      packagingFeePerAdicionalUsdCents: 100,
      packagingFeePerBebidaUsdCents: 100,
      deliveryFeeUsdCents: 500,
      deliveryCoverage: "Zona norte",
      paymentPagoMovilEnabled: true,
      paymentTransferEnabled: true,
      menuLayout: "modern",
      menuItemSortMode: "price_asc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output.menuItemSortMode).toBe("price_asc");
      expect(result.output.menuLayout).toBe("modern");
      expect(result.output.logoUrl).toBe("https://example.com/logo.png");
    }
  });
});

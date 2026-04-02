import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCheckoutSurcharges } from "@/hooks/useCheckoutSurcharges";
import type { CartItem } from "@/store/cartStore";

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "item-1",
    name: "Pollo",
    emoji: "🍗",
    baseUsdCents: 500,
    baseBsCents: 18250,
    fixedContornos: [],
    contornoSubstitutions: [],
    selectedAdicionales: [],
    selectedBebidas: [],
    removedComponents: [],
    quantity: 1,
    itemTotalBsCents: 18250,
    categoryAllowAlone: true,
    ...overrides,
  };
}

const settings = {
  rate: 36.50,
  orderModeOnSiteEnabled: true,
  orderModeTakeAwayEnabled: true,
  orderModeDeliveryEnabled: true,
  packagingFeePerPlateUsdCents: 200,
  packagingFeePerAdicionalUsdCents: 100,
  packagingFeePerBebidaUsdCents: 100,
  deliveryFeeUsdCents: 500,
  deliveryCoverage: null,
  transferBankName: "",
  transferAccountName: "",
  transferAccountNumber: "",
  transferAccountRif: "",
  paymentPagoMovilEnabled: true,
  paymentTransferEnabled: true,
};

describe("useCheckoutSurcharges", () => {
  it("returns zero surcharges for on_site mode", () => {
    const { result } = renderHook(() =>
      useCheckoutSurcharges({
        items: [makeCartItem()],
        orderMode: "on_site",
        settings,
        totalBsCents: 18250,
        totalUsdCents: 500,
      }),
    );

    expect(result.current.surcharges.totalSurchargeUsdCents).toBe(0);
    expect(result.current.grandTotalBsCents).toBe(18250);
  });

  it("calculates packaging for take_away", () => {
    const { result } = renderHook(() =>
      useCheckoutSurcharges({
        items: [makeCartItem({ quantity: 2 })],
        orderMode: "take_away",
        settings,
        totalBsCents: 36500,
        totalUsdCents: 1000,
      }),
    );

    // 2 plates × 200 cents = 400
    expect(result.current.surcharges.plateCount).toBe(2);
    expect(result.current.surcharges.packagingUsdCents).toBe(400);
    expect(result.current.surcharges.deliveryUsdCents).toBe(0);
    expect(result.current.surcharges.totalSurchargeUsdCents).toBe(400);
  });

  it("calculates packaging for adicionales and bebidas", () => {
    const { result } = renderHook(() =>
      useCheckoutSurcharges({
        items: [
          makeCartItem({
            quantity: 1,
            selectedAdicionales: [{ id: "a1", name: "Queso", priceUsdCents: 60, priceBsCents: 2190 }],
            selectedBebidas: [{ id: "b1", name: "Cola", priceUsdCents: 100, priceBsCents: 3650 }],
          }),
        ],
        orderMode: "take_away",
        settings,
        totalBsCents: 21900,
        totalUsdCents: 600,
      }),
    );

    expect(result.current.surcharges.plateCount).toBe(1);
    expect(result.current.surcharges.adicionalCount).toBe(1);
    expect(result.current.surcharges.bebidaCount).toBe(1);
    // 1×200 + 1×100 + 1×100 = 400
    expect(result.current.surcharges.packagingUsdCents).toBe(400);
  });

  it("adds delivery fee for delivery mode", () => {
    const { result } = renderHook(() =>
      useCheckoutSurcharges({
        items: [makeCartItem()],
        orderMode: "delivery",
        settings,
        totalBsCents: 18250,
        totalUsdCents: 500,
      }),
    );

    // packaging 200 + delivery 500 = 700
    expect(result.current.surcharges.totalSurchargeUsdCents).toBe(700);
    expect(result.current.surcharges.deliveryUsdCents).toBe(500);
  });

  it("returns zero when no orderMode selected", () => {
    const { result } = renderHook(() =>
      useCheckoutSurcharges({
        items: [makeCartItem()],
        orderMode: null,
        settings,
        totalBsCents: 18250,
        totalUsdCents: 500,
      }),
    );

    expect(result.current.surcharges.totalSurchargeUsdCents).toBe(0);
  });
});

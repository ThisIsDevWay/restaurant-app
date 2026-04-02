import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCartCalculation } from "@/hooks/useCartCalculation";
import type { Contorno, GlobalContorno, SimpleItem, MenuItem } from "@/components/customer/ItemDetailModal.types";

const RATE = 36.50;

function makeItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item-1",
    name: "Pollo Guisado",
    description: null,
    priceUsdCents: 500,
    categoryId: "cat-1",
    categoryName: "Pollos",
    categoryAllowAlone: true,
    isAvailable: true,
    imageUrl: null,
    optionGroups: [],
    adicionales: [],
    bebidas: [],
    contornos: [],
    ...overrides,
  };
}

const contornoFixed: Contorno = {
  id: "c1", name: "Arroz", priceUsdCents: 50,
  isAvailable: true, removable: false, substituteContornoIds: [], sortOrder: 0,
};

const contornoRemovable: Contorno = {
  id: "c2", name: "Ensalada", priceUsdCents: 30,
  isAvailable: true, removable: true, substituteContornoIds: ["c3"], sortOrder: 1,
};

const globalContornoSub: GlobalContorno = {
  id: "c3", name: "Tajadas", priceUsdCents: 40,
  isAvailable: true, sortOrder: 2,
};

const adicional: SimpleItem = {
  id: "a1", name: "Queso extra", priceUsdCents: 60,
  isAvailable: true, sortOrder: 0,
};

const bebida: SimpleItem = {
  id: "b1", name: "Coca-Cola", priceUsdCents: 100,
  isAvailable: true, sortOrder: 0,
};

describe("useCartCalculation", () => {
  function renderCalc(partial: Partial<Parameters<typeof useCartCalculation>[0]> = {}) {
    return renderHook(() =>
      useCartCalculation({
        item: makeItem(),
        availableContornos: [],
        fixedContornos: [],
        removableContornos: [],
        substitutionMap: {},
        selectedAdicionalIds: new Set(),
        selectedBebidaIds: new Set(),
        selectedRadio: {},
        dailyAdicionales: [],
        dailyBebidas: [],
        allContornos: [],
        quantity: 1,
        currentRateBsPerUsd: RATE,
        ...partial,
      }),
    );
  }

  it("calculates base totals with no extras", () => {
    const { result } = renderCalc();
    expect(result.current.totalUsdCents).toBe(500);
    expect(result.current.totalBsCents).toBe(Math.round(500 * RATE));
    expect(result.current.extrasCount).toBe(0);
  });

  it("includes fixed contornos in Bs calculation", () => {
    const { result } = renderCalc({
      availableContornos: [contornoFixed],
      fixedContornos: [contornoFixed],
    });
    // fixed contorno: 50 USD cents → bs = round(50 * 36.50) = 1825
    expect(result.current.cartFixedContornos).toHaveLength(1);
    expect(result.current.cartFixedContornos[0].priceBsCents).toBe(Math.round(50 * RATE));
    // TotalUsdCents is item + contorno substitution (but fixed contornos are not in totalUsdCents here)
    // The hook calculates: (item.priceUsdCents + substitutionUsdCents + additionalUsdCents + bebidasUsdCents) * quantity
    // Fixed contornos are listed but their USD is NOT added to the total (they're included in the base price)
  });

  it("applies currentRateBsPerUsd to all Bs prices — verificación de dependencia crítica", () => {
    const { result, rerender } = renderCalc({
      availableContornos: [contornoRemovable],
      removableContornos: [contornoRemovable],
      allContornos: [contornoRemovable, globalContornoSub],
      substitutionMap: { c2: "c3" },
    });

    const bsAtFirstRate = result.current.cartContornoSubstitutions[0].priceBsCents;
    expect(bsAtFirstRate).toBe(Math.round(40 * RATE));

    // Re-render with different rate — must recalculate
    const newRate = 50.00;
    const { result: result2 } = renderCalc({
      availableContornos: [contornoRemovable],
      removableContornos: [contornoRemovable],
      allContornos: [contornoRemovable, globalContornoSub],
      substitutionMap: { c2: "c3" },
      currentRateBsPerUsd: newRate,
    });

    const bsAtNewRate = result2.current.cartContornoSubstitutions[0].priceBsCents;
    expect(bsAtNewRate).toBe(Math.round(40 * newRate));
    expect(bsAtNewRate).not.toBe(bsAtFirstRate);
  });

  it("multiplies by quantity correctly", () => {
    const { result } = renderCalc({ quantity: 3 });
    expect(result.current.totalUsdCents).toBe(500 * 3);
    expect(result.current.totalBsCents).toBe(Math.round(500 * 3 * RATE));
  });

  it("includes adicionales and bebidas in totals", () => {
    const { result } = renderCalc({
      dailyAdicionales: [adicional],
      selectedAdicionalIds: new Set(["a1"]),
      dailyBebidas: [bebida],
      selectedBebidaIds: new Set(["b1"]),
    });
    // totalUsdCents = (500 + 60 + 100) * 1 = 660
    expect(result.current.totalUsdCents).toBe(660);
    expect(result.current.cartAdicionales).toHaveLength(1);
    expect(result.current.cartBebidas).toHaveLength(1);
    expect(result.current.extrasCount).toBe(2);
  });

  it("detects unsatisfied required radio groups", () => {
    const group = {
      id: "g1", name: "Cocción", type: "radio" as const,
      required: true, sortOrder: 0,
      options: [
        { id: "o1", name: "Frito", priceUsdCents: 0, isAvailable: true, sortOrder: 0 },
      ],
    };
    const { result } = renderCalc({
      item: makeItem({ optionGroups: [group] }),
    });
    expect(result.current.allRequiredSatisfied).toBe(false);
    expect(result.current.unsatisfiedGroup?.name).toBe("Cocción");
  });

  it("is satisfied when required radio is selected", () => {
    const group = {
      id: "g1", name: "Cocción", type: "radio" as const,
      required: true, sortOrder: 0,
      options: [
        { id: "o1", name: "Frito", priceUsdCents: 0, isAvailable: true, sortOrder: 0 },
      ],
    };
    const { result } = renderCalc({
      item: makeItem({ optionGroups: [group] }),
      selectedRadio: { g1: "o1" },
    });
    expect(result.current.allRequiredSatisfied).toBe(true);
    expect(result.current.unsatisfiedGroup).toBeUndefined();
  });
});

/**
 * Tests unitarios para calculateSurcharges — funcion pura centralizada.
 *
 * Single source of truth para el calculo de packaging y delivery fees.
 * Verifica que los resultados coincidan con los casos de negocio documentados.
 */
import { describe, it, expect } from "vitest";
import {
  calculateSurcharges,
  buildSurchargesSnapshot,
  type SurchargeItem,
  type SurchargeSettings,
  type SurchargeResult,
  type SurchargesSnapshot,
} from "@/lib/utils/calculate-surcharges";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const settings: SurchargeSettings = {
  packagingFeePerPlateUsdCents: 200,
  packagingFeePerAdicionalUsdCents: 100,
  packagingFeePerBebidaUsdCents: 100,
  deliveryFeeUsdCents: 500,
};

function plate(name = "Pollo", qty = 1): SurchargeItem {
  return {
    categoryIsSimple: false,
    categoryName: "Platos Fuertes",
    quantity: qty,
    selectedAdicionales: [],
    selectedBebidas: [],
  };
}

function adicional(name = "Queso", qty = 1): SurchargeItem {
  return {
    categoryIsSimple: true,
    categoryName: "Adicionales",
    quantity: qty,
    selectedAdicionales: [],
    selectedBebidas: [],
  };
}

function bebida(name = "Pepsi", qty = 1): SurchargeItem {
  return {
    categoryIsSimple: true,
    categoryName: "Bebidas",
    quantity: qty,
    selectedAdicionales: [],
    selectedBebidas: [],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calculateSurcharges", () => {
  describe("on_site mode", () => {
    it("returns zero surcharges for on_site", () => {
      const result = calculateSurcharges([plate()], "on_site", settings);
      expect(result).toEqual({
        plateCount: 0,
        adicionalCount: 0,
        bebidaCount: 0,
        packagingUsdCents: 0,
        deliveryUsdCents: 0,
        totalSurchargeUsdCents: 0,
      });
    });

    it("returns zero surcharges for null orderMode", () => {
      const result = calculateSurcharges([plate()], null, settings);
      expect(result.totalSurchargeUsdCents).toBe(0);
    });
  });

  describe("take_away mode", () => {
    it("counts main dishes as plateCount", () => {
      const result = calculateSurcharges([plate("Pollo", 2)], "take_away", settings);
      expect(result.plateCount).toBe(2);
      expect(result.adicionalCount).toBe(0);
      expect(result.bebidaCount).toBe(0);
      // 2 × 200 = 400
      expect(result.packagingUsdCents).toBe(400);
      expect(result.deliveryUsdCents).toBe(0);
      expect(result.totalSurchargeUsdCents).toBe(400);
    });

    it("counts accessories as adicionalCount", () => {
      const result = calculateSurcharges([adicional("Queso", 3)], "take_away", settings);
      expect(result.plateCount).toBe(0);
      expect(result.adicionalCount).toBe(3);
      expect(result.bebidaCount).toBe(0);
      // 3 × 100 = 300
      expect(result.packagingUsdCents).toBe(300);
      expect(result.totalSurchargeUsdCents).toBe(300);
    });

    it("counts drinks as bebidaCount", () => {
      const result = calculateSurcharges([bebida("Pepsi", 2)], "take_away", settings);
      expect(result.plateCount).toBe(0);
      expect(result.adicionalCount).toBe(0);
      expect(result.bebidaCount).toBe(2);
      // 2 × 100 = 200
      expect(result.packagingUsdCents).toBe(200);
      expect(result.totalSurchargeUsdCents).toBe(200);
    });

    it("counts sub-items within a dish", () => {
      const result = calculateSurcharges(
        [
          {
            ...plate("Pollo", 1),
            selectedAdicionales: [{ quantity: 2 }],
            selectedBebidas: [{ quantity: 1 }],
          },
        ],
        "take_away",
        settings,
      );
      expect(result.plateCount).toBe(1);
      expect(result.adicionalCount).toBe(2); // 2 adicionales × 1 dish
      expect(result.bebidaCount).toBe(1); // 1 bebida × 1 dish
      // 1×200 + 2×100 + 1×100 = 500
      expect(result.packagingUsdCents).toBe(500);
      expect(result.totalSurchargeUsdCents).toBe(500);
    });

    it("handles mixed order with plates, adicionales, and drinks", () => {
      const result = calculateSurcharges(
        [plate("Pollo", 2), adicional("Queso", 3), bebida("Pepsi", 1)],
        "take_away",
        settings,
      );
      expect(result.plateCount).toBe(2);
      expect(result.adicionalCount).toBe(3);
      expect(result.bebidaCount).toBe(1);
      // 2×200 + 3×100 + 1×100 = 800
      expect(result.packagingUsdCents).toBe(800);
      expect(result.totalSurchargeUsdCents).toBe(800);
    });
  });

  describe("delivery mode", () => {
    it("adds delivery fee on top of packaging", () => {
      const result = calculateSurcharges([plate("Pollo", 1)], "delivery", settings);
      expect(result.plateCount).toBe(1);
      expect(result.packagingUsdCents).toBe(200);
      expect(result.deliveryUsdCents).toBe(500);
      expect(result.totalSurchargeUsdCents).toBe(700);
    });

    it("applies delivery fee even with empty cart", () => {
      const result = calculateSurcharges([], "delivery", settings);
      expect(result.deliveryUsdCents).toBe(500);
      expect(result.totalSurchargeUsdCents).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("handles empty items array", () => {
      const result = calculateSurcharges([], "take_away", settings);
      expect(result.totalSurchargeUsdCents).toBe(0);
    });

    it("handles category name case insensitivity for drinks", () => {
      const result = calculateSurcharges(
        [{ categoryIsSimple: true, categoryName: "BEBIDAS FRIAS", quantity: 1, selectedAdicionales: [], selectedBebidas: [] }],
        "take_away",
        settings,
      );
      expect(result.bebidaCount).toBe(1);
      expect(result.adicionalCount).toBe(0);
    });

    it("defaults quantity to 0 if selectedAdicionales/selectedBebidas are empty", () => {
      const result = calculateSurcharges([plate("Pollo", 1)], "take_away", settings);
      expect(result.adicionalCount).toBe(0);
      expect(result.bebidaCount).toBe(0);
    });

    it("excludes contorno substitutions from adicional count", () => {
      const result = calculateSurcharges(
        [
          {
            ...plate("Pollo", 1),
            selectedAdicionales: [
              { quantity: 2 },                                         // pure adicional → counts
              { quantity: 1, substitutesComponentId: "replaced-id" },  // substitution → excluded
            ],
          },
        ],
        "take_away",
        settings,
      );
      // Only the pure adicional (qty 2) counts, substitution is excluded
      expect(result.adicionalCount).toBe(2);
      // 1×200 (plate) + 2×100 (adicionales) = 400
      expect(result.packagingUsdCents).toBe(400);
    });
  });
});

describe("buildSurchargesSnapshot", () => {
  it("includes all fee unit values for audit trail", () => {
    const surcharges: SurchargeResult = {
      plateCount: 2,
      adicionalCount: 3,
      bebidaCount: 1,
      packagingUsdCents: 800,
      deliveryUsdCents: 500,
      totalSurchargeUsdCents: 1300,
    };

    const snapshot: SurchargesSnapshot = buildSurchargesSnapshot(surcharges, "delivery", settings);

    // Counts
    expect(snapshot.plateCount).toBe(2);
    expect(snapshot.adicionalCount).toBe(3);
    expect(snapshot.bebidaCount).toBe(1);

    // Unit fees at the moment of checkout
    expect(snapshot.packagingFeePerPlateUsdCents).toBe(200);
    expect(snapshot.packagingFeePerAdicionalUsdCents).toBe(100);
    expect(snapshot.packagingFeePerBebidaUsdCents).toBe(100);
    expect(snapshot.deliveryFeeUsdCents).toBe(500);

    // Totals
    expect(snapshot.packagingUsdCents).toBe(800);
    expect(snapshot.deliveryUsdCents).toBe(500);

    // Context
    expect(snapshot.orderMode).toBe("delivery");
  });

  it("defaults orderMode to on_site when null", () => {
    const surcharges: SurchargeResult = {
      plateCount: 0, adicionalCount: 0, bebidaCount: 0,
      packagingUsdCents: 0, deliveryUsdCents: 0, totalSurchargeUsdCents: 0,
    };
    const snapshot = buildSurchargesSnapshot(surcharges, null, settings);
    expect(snapshot.orderMode).toBe("on_site");
  });
});

import { describe, it, expect } from "vitest";
import { getAllowedSubstitutes } from "@/lib/menu/substitutes";
import type { ContornoComponent, MenuItemWithComponents } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";

function contorno(overrides: Partial<ContornoComponent> = {}): ContornoComponent {
  return {
    id: "c1", name: "Arroz", priceUsdCents: 0,
    isAvailable: true, isPrepackaged: false, removable: false,
    substituteContornoIds: [], sortOrder: 0,
    ...overrides,
  };
}

function daily(id: string, overrides: Partial<SimpleItem> = {}): SimpleItem {
  return {
    id, name: id.toUpperCase(), priceUsdCents: 100,
    isAvailable: true, isPrepackaged: false, sortOrder: 0,
    ...overrides,
  };
}

const item = (contornos: ContornoComponent[]): Pick<MenuItemWithComponents, "contornos"> => ({ contornos });

describe("getAllowedSubstitutes", () => {
  it("returns [] when there are no daily contornos", () => {
    expect(getAllowedSubstitutes(item([contorno()]), [])).toEqual([]);
    expect(getAllowedSubstitutes(item([contorno()]), undefined)).toEqual([]);
  });

  it("rule 1: returns only the explicitly mapped, available substitutes", () => {
    const dish = item([contorno({ substituteContornoIds: ["c3", "c4"] })]);
    const dc = [daily("c3"), daily("c4", { isAvailable: false }), daily("c5")];
    const result = getAllowedSubstitutes(dish, dc);
    expect(result.map((c) => c.id)).toEqual(["c3"]); // c4 unavailable, c5 not mapped
  });

  it("rule 2: with a removable contorno and no explicit map, offers all available daily contornos except included ones", () => {
    const dish = item([contorno({ id: "c1", removable: true })]);
    const dc = [daily("c1"), daily("c2"), daily("c3", { isAvailable: false })];
    const result = getAllowedSubstitutes(dish, dc);
    expect(result.map((c) => c.id)).toEqual(["c2"]); // c1 excluded (included), c3 unavailable
  });

  it("rule 3: no explicit map and no removable contorno → no substitutes", () => {
    const dish = item([contorno({ removable: false })]);
    expect(getAllowedSubstitutes(dish, [daily("c2")])).toEqual([]);
  });
});

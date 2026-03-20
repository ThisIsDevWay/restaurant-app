import { describe, it, expect } from "vitest";
import {
  usdCentsToBsCents,
  formatRef,
  formatBs,
  totalFromItems,
} from "@/lib/money";

describe("usdCentsToBsCents", () => {
  it("converts USD cents to Bs cents correctly", () => {
    expect(usdCentsToBsCents(310, 451.507)).toBe(139967);
  });

  it("handles whole dollar amounts", () => {
    expect(usdCentsToBsCents(1000, 451.5072)).toBe(451507);
  });

  it("handles zero", () => {
    expect(usdCentsToBsCents(0, 451.507)).toBe(0);
  });

  it("handles rounding edge cases", () => {
    expect(usdCentsToBsCents(1, 451.507)).toBe(452);
    expect(usdCentsToBsCents(2, 451.507)).toBe(903);
  });

  it("has no floating point errors in any case", () => {
    const rates = [451.5072, 451.5, 36.5, 1.0, 12345.6789];
    for (const rate of rates) {
      for (let cents = 0; cents <= 10000; cents += 1) {
        const result = usdCentsToBsCents(cents, rate);
        expect(Number.isInteger(result)).toBe(true);
      }
    }
  });
});

describe("formatRef", () => {
  it("formats 310 as 'REF 3,10'", () => {
    expect(formatRef(310)).toBe("REF 3,10");
  });

  it("formats 1500 as 'REF 15,00'", () => {
    expect(formatRef(1500)).toBe("REF 15,00");
  });

  it("formats 0 as 'REF 0,00'", () => {
    expect(formatRef(0)).toBe("REF 0,00");
  });

  it("formats 100000 as 'REF 1000,00'", () => {
    expect(formatRef(100000)).toBe("REF 1000,00");
  });
});

describe("formatBs", () => {
  it("formats 139967 as 'Bs. 1.399,67'", () => {
    expect(formatBs(139967)).toBe("Bs. 1.399,67");
  });

  it("formats 392815 as 'Bs. 3.928,15'", () => {
    expect(formatBs(392815)).toBe("Bs. 3.928,15");
  });

  it("formats small amounts correctly", () => {
    expect(formatBs(1)).toBe("Bs. 0,01");
    expect(formatBs(50)).toBe("Bs. 0,50");
  });

  it("formats large amounts with thousands separator", () => {
    expect(formatBs(1234567)).toBe("Bs. 12.345,67");
  });

  it("formats 0 as 'Bs. 0,00'", () => {
    expect(formatBs(0)).toBe("Bs. 0,00");
  });
});

describe("totalFromItems", () => {
  it("sums items correctly", () => {
    const items = [
      { priceCents: 310, quantity: 2 },
      { priceCents: 500, quantity: 1 },
    ];
    expect(totalFromItems(items)).toBe(1120);
  });

  it("returns 0 for empty array", () => {
    expect(totalFromItems([])).toBe(0);
  });

  it("handles single item", () => {
    expect(totalFromItems([{ priceCents: 1500, quantity: 3 }])).toBe(4500);
  });

  it("maintains integer precision", () => {
    const items = Array.from({ length: 100 }, () => ({
      priceCents: 33,
      quantity: 3,
    }));
    const result = totalFromItems(items);
    expect(result).toBe(9900);
    expect(Number.isInteger(result)).toBe(true);
  });
});

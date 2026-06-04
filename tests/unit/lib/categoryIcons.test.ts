import { describe, it, expect } from "vitest";
import { getCategoryEmoji } from "@/lib/categoryIcons";

describe("getCategoryEmoji", () => {
  it("maps known categories to their emoji", () => {
    expect(getCategoryEmoji("pollos")).toBe("🍗");
    expect(getCategoryEmoji("carnes")).toBe("🥩");
    expect(getCategoryEmoji("bebidas")).toBe("🥤");
    expect(getCategoryEmoji("adicionales")).toBe("🍟");
  });

  it("is case- and accent-insensitive", () => {
    expect(getCategoryEmoji("POLLOS")).toBe("🍗");
    expect(getCategoryEmoji("Pollos")).toBe("🍗");
    // accented key normalizes to the same bucket
    expect(getCategoryEmoji("sándwiches")).toBe("🥪");
    expect(getCategoryEmoji("sandwiches")).toBe("🥪");
  });

  it("includes the POS-only extra categories", () => {
    expect(getCategoryEmoji("postres")).toBe("🍮");
    expect(getCategoryEmoji("sopas")).toBe("🍲");
  });

  it("falls back to the generic plate for unknown categories", () => {
    expect(getCategoryEmoji("desconocido")).toBe("🍽️");
    expect(getCategoryEmoji("")).toBe("🍽️");
  });
});

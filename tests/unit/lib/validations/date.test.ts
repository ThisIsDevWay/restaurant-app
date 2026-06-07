import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { dateStringSchema } from "@/lib/validations/date";

describe("dateStringSchema", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    const result = v.safeParse(dateStringSchema, "2026-06-06");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.output).toBe("2026-06-06");
    }
  });

  it("rejects invalid format", () => {
    const result = v.safeParse(dateStringSchema, "06-06-2026");
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric characters", () => {
    const result = v.safeParse(dateStringSchema, "202a-0b-0c");
    expect(result.success).toBe(false);
  });

  it("rejects semantically impossible dates (month 13)", () => {
    const result = v.safeParse(dateStringSchema, "2026-13-10");
    expect(result.success).toBe(false);
  });

  it("rejects semantically impossible dates (day 40)", () => {
    const result = v.safeParse(dateStringSchema, "2026-06-40");
    expect(result.success).toBe(false);
  });

  it("rejects leap year invalid dates", () => {
    // 2025 is not a leap year, so Feb 29 is invalid
    const result = v.safeParse(dateStringSchema, "2025-02-29");
    expect(result.success).toBe(false);
  });

  it("accepts leap year valid dates", () => {
    // 2024 is a leap year, so Feb 29 is valid
    const result = v.safeParse(dateStringSchema, "2024-02-29");
    expect(result.success).toBe(true);
  });
});

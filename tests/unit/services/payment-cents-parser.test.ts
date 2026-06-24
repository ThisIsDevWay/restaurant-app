import { describe, it, expect } from "vitest";
import { parseBankSmsToCents } from "@/services/payment.service";

describe("parseBankSmsToCents", () => {
  it("debe procesar montos con formato europeo/venezolano estándar (punto de miles, coma decimal)", () => {
    expect(parseBankSmsToCents("3.829,36")).toBe(382936);
    expect(parseBankSmsToCents("150,00")).toBe(15000);
    expect(parseBankSmsToCents("1.500,50")).toBe(150050);
  });

  it("debe procesar montos con formato americano estándar (coma de miles, punto decimal)", () => {
    expect(parseBankSmsToCents("3,829.36")).toBe(382936);
    expect(parseBankSmsToCents("150.00")).toBe(15000);
    expect(parseBankSmsToCents("1,500.50")).toBe(150050);
  });

  it("debe procesar montos con doble punto (punto de miles, punto decimal)", () => {
    expect(parseBankSmsToCents("3.829.36")).toBe(382936);
    expect(parseBankSmsToCents("1.500.50")).toBe(150050);
  });

  it("debe procesar montos enteros sin decimales (sin separadores)", () => {
    expect(parseBankSmsToCents("150")).toBe(15000);
    expect(parseBankSmsToCents("3829")).toBe(382900);
  });

  it("debe procesar montos enteros con separadores de miles y sin decimales de 3 dígitos", () => {
    expect(parseBankSmsToCents("1.500")).toBe(150000);
    expect(parseBankSmsToCents("1,500")).toBe(150000);
  });

  it("debe procesar montos con un solo decimal", () => {
    expect(parseBankSmsToCents("150,5")).toBe(15050);
    expect(parseBankSmsToCents("150.5")).toBe(15050);
  });

  it("debe manejar múltiples separadores de miles", () => {
    expect(parseBankSmsToCents("1.234.567,89")).toBe(123456789);
    expect(parseBankSmsToCents("1,234,567.89")).toBe(123456789);
  });

  it("debe manejar inputs vacíos o sin dígitos", () => {
    expect(parseBankSmsToCents("")).toBe(0);
    expect(parseBankSmsToCents("Bs.")).toBe(0);
  });

  it("debe manejar separador final sin decimales (input truncado)", () => {
    expect(parseBankSmsToCents("150.")).toBe(15000);
    expect(parseBankSmsToCents("150,")).toBe(15000);
  });

  it("regresión literal del bug report (los 3 montos en Supabase)", () => {
    // 1. amount_raw: "3,829.36" -> 382936 (antes daba 382)
    expect(parseBankSmsToCents("3,829.36")).toBe(382936);

    // 2. amount_raw: "3.829,36" -> 382936 (antes daba 382936)
    expect(parseBankSmsToCents("3.829,36")).toBe(382936);

    // 3. amount_raw: "3.829.36" -> 382936 (antes daba 38293600)
    expect(parseBankSmsToCents("3.829.36")).toBe(382936);
  });
});

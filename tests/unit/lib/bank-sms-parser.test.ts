import { describe, it, expect } from "vitest";
import { extractSmsFields } from "@/lib/bank-sms-parser";

describe("extractSmsFields", () => {
  it("parses BDV (278) SMS formats correctly", () => {
    const bdvSms = "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432";
    const res = extractSmsFields("278", bdvSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
    expect(res?.phone).toBe("04141234567");
  });

  it("parses Banesco SMS formats correctly", () => {
    const banescoSms = "Banesco: Recibio Pago Movil de V12345678 por Bs 350,50 Ref: 123456";
    const res = extractSmsFields("banesco", banescoSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("350,50");
    expect(res?.reference).toBe("123456");
  });

  it("parses Mercantil app notifications correctly", () => {
    const mercantilSms = "Mercantil: Pago Movil por Bs 450,00 recibido de 04125555555 Ref: 654321";
    const res1 = extractSmsFields("com.mercantil.movil", mercantilSms);
    expect(res1).not.toBeNull();
    expect(res1?.amountRaw).toBe("450,00");
    expect(res1?.reference).toBe("654321");

    const res2 = extractSmsFields("com.mercantil.banco.personas", mercantilSms);
    expect(res2).not.toBeNull();
    expect(res2?.amountRaw).toBe("450,00");

    const res3 = extractSmsFields("com.mercantil.banco.empresas", mercantilSms);
    expect(res3).not.toBeNull();
    expect(res3?.amountRaw).toBe("450,00");
  });

  it("parses BDV app notifications correctly", () => {
    const bdvSms = "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432";
    const res = extractSmsFields("com.bancodevenezuela.bdvdigital", bdvSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
  });

  it("parses Provincial app notifications correctly", () => {
    const provincialSms = "Provincial: Pago Movil recibido por Bs. 150,00 de V-12345678 Ref: 98765432";
    const res = extractSmsFields("com.bbva.provincial.ve", provincialSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
  });

  it("parses Banesco app notifications correctly", () => {
    const banescoSms = "Banesco: Recibio Pago Movil de V12345678 por Bs 350,50 Ref: 123456";
    const res = extractSmsFields("com.banesco.banescovenezuela", banescoSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("350,50");
    expect(res?.reference).toBe("123456");
  });

  it("parses generic SMS fallback correctly", () => {
    const genericMsg = "Pago recibido por monto de 500,75 Bs. Ref: 789012";
    const res = extractSmsFields("unknown_sender", genericMsg);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("500,75");
    expect(res?.reference).toBe("789012");
  });

  it("returns null for non-payment messages", () => {
    const invalid = "Hola, tu código de verificación es 4829";
    const res = extractSmsFields("278", invalid);
    expect(res).toBeNull();
  });
});

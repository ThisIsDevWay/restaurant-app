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
    expect(res?.document).toBe("V-12345678");
  });

  it("parses Banesco SMS formats correctly", () => {
    const banescoSms = "Banesco: Recibio Pago Movil de V12345678 por Bs 350,50 Ref: 123456";
    const res = extractSmsFields("banesco", banescoSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("350,50");
    expect(res?.reference).toBe("123456");
    expect(res?.phone).toBeUndefined();
    expect(res?.document).toBe("V12345678");
  });

  it("parses Mercantil app notifications correctly", () => {
    const mercantilSms = "Mercantil: Pago Movil por Bs 450,00 recibido de 04125555555 Ref: 654321";
    const res1 = extractSmsFields("com.mercantil.movil", mercantilSms);
    expect(res1).not.toBeNull();
    expect(res1?.amountRaw).toBe("450,00");
    expect(res1?.reference).toBe("654321");
    expect(res1?.phone).toBe("04125555555");
    expect(res1?.document).toBeUndefined();

    const res2 = extractSmsFields("com.mercantil.banco.personas", mercantilSms);
    expect(res2).not.toBeNull();
    expect(res2?.amountRaw).toBe("450,00");
    expect(res2?.phone).toBe("04125555555");

    const res3 = extractSmsFields("com.mercantil.banco.empresas", mercantilSms);
    expect(res3).not.toBeNull();
    expect(res3?.amountRaw).toBe("450,00");
    expect(res3?.phone).toBe("04125555555");
  });

  it("parses Mercantil newer app push notifications correctly", () => {
    const mercantilSms = "Tpago recibido Bs. 52,65 del 04246302323 Ref 006503112113, 26/06/2026, 05:43 PM. Conoce el servicio Envío de Divisas en portaldepagosmercantil.com";
    const res = extractSmsFields("com.mercantilbanco.mercantilmovil", mercantilSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("52,65");
    expect(res?.reference).toBe("006503112113");
    expect(res?.phone).toBe("04246302323");
    expect(res?.document).toBeUndefined();
  });

  it("parses BDV app notifications correctly", () => {
    const bdvSms = "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432";
    const res = extractSmsFields("com.bancodevenezuela.bdvdigital", bdvSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
    expect(res?.phone).toBe("04141234567");
    expect(res?.document).toBe("V-12345678");
  });

  it("parses BDV PagomovilBDV app notifications correctly", () => {
    const msg = "Recibiste un PagomovilBDV por Bs.22,35 del 0424-6302323 Ref: 317734977385 en fecha 26-06-26 hora: 16:23.";
    const res = extractSmsFields("com.bancodevenezuela.bdvdigital", msg);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("22,35");
    expect(res?.reference).toBe("317734977385");
    expect(res?.phone).toBe("04246302323");
    expect(res?.document).toBeUndefined();
  });

  it("parses BDV app transfer notifications from other banks correctly", () => {
    const bdvNotification = "Recibiste una transferencia de otros bancos de PIRELA ROMERO MARIA PEREZ por Bs. 50,00 bajo el número de operación 68537493.\nSaldo disponible Bs. 149,91";
    const res = extractSmsFields("com.bancodevenezuela.bdvdigital", bdvNotification);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("50,00");
    expect(res?.reference).toBe("68537493");
    expect(res?.phone).toBeUndefined();
    expect(res?.document).toBeUndefined();
  });

  it("parses Provincial app notifications correctly", () => {
    const provincialSms = "Provincial: Pago Movil recibido por Bs. 150,00 de V-12345678 Ref: 98765432";
    const res = extractSmsFields("com.bbva.provincial.ve", provincialSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
  });

  it("parses Provincial shortcode 77107 SMS format correctly", () => {
    const provincialSms = "BBVA Provincial informa: has recibido un Pago Movil Dinero Rapido Otros Bancos Ref:006503555774 del Tlf.**23 por Bs          54,89.";
    const res = extractSmsFields("77107", provincialSms);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("54,89");
    expect(res?.reference).toBe("006503555774");
    expect(res?.phone).toBeUndefined();
    expect(res?.document).toBeUndefined();
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

  it("parses BDV notifications with Bs without dot", () => {
    const msg = "BDV: Pago Movil recibido por Bs 250,00 de V-12345678 Cel. 04141234567 Ref: 98765432";
    const res = extractSmsFields("278", msg);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("250,00");
  });

  it("handles messages with carriage returns \\r\\n and extra spacing", () => {
    const msg = "Recibiste Pago Movil\r\nde V-12345678 por Bs. 150,00\r\nRef: 98765432   ";
    const res = extractSmsFields("278", msg);
    expect(res).not.toBeNull();
    expect(res?.amountRaw).toBe("150,00");
    expect(res?.reference).toBe("98765432");
  });

  it("cleans trailing commas or periods from amountRaw", () => {
    const msgComas = "Recibiste Pago Movil por Bs. 150, de V-12345678 Ref: 98765432";
    const resComas = extractSmsFields("278", msgComas);
    expect(resComas?.amountRaw).toBe("150");

    const msgPunto = "Saldo disponible Bs. 149,91. Recibiste un PagomovilBDV por Bs.22,35. Ref: 98765432";
    const resPunto = extractSmsFields("com.bancodevenezuela.bdvdigital", msgPunto);
    expect(resPunto?.amountRaw).toBe("149,91");
  });

  it("only captures DNI with length between 5 and 10 digits to prevent false positives", () => {
    const msgShort = "Version V2 Pago por Bs. 150,00 Ref: 98765432";
    const resShort = extractSmsFields("278", msgShort);
    expect(resShort?.document).toBeUndefined();

    const msgMin = "Pago de V-12345 por Bs. 150,00 Ref: 98765432";
    const resMin = extractSmsFields("278", msgMin);
    expect(resMin?.document).toBe("V-12345");

    const msgMax = "Pago de V-1234567890 por Bs. 150,00 Ref: 98765432";
    const resMax = extractSmsFields("278", msgMax);
    expect(resMax?.document).toBe("V-1234567890");

    const msgLong = "Pago de V-12345678901 por Bs. 150,00 Ref: 98765432";
    const resLong = extractSmsFields("278", msgLong);
    expect(resLong?.document).toBeUndefined();
  });
});

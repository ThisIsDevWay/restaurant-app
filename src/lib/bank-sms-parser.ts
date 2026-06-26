export interface ParsedSmsFields {
  amountRaw: string;
  reference: string;
  phone?: string;
  document?: string;
}

export function extractSmsFields(sender: string, message: string): ParsedSmsFields | null {
  const cleanMsg = message.replace(/[\r\n]+/g, " ").trim();

  // 1. Banco de Venezuela (BDV - Emisor 278)
  // Ejemplo: "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432"
  if (sender === "278" || sender === "com.bancodevenezuela.bdvdigital" || cleanMsg.toUpperCase().includes("BDV")) {
    const amountMatch = cleanMsg.match(/Bs\.?\s*([\d,.]+)/i);
    const refMatch =
      cleanMsg.match(/Ref:\s*(\d+)/i) ||
      cleanMsg.match(/Referencia:\s*(\d+)/i) ||
      cleanMsg.match(/operaci[oó]n\s*(\d+)/i);
    const phoneMatch = cleanMsg.match(/(?:Cel\.|del|de)\s*(0?\d{3}-?\d{7})/i);
    const docMatch = cleanMsg.match(/\b([VEve]-?\d{5,10})\b/i);
    if (amountMatch && refMatch) {
      return {
        amountRaw: amountMatch[1].replace(/[.,]+$/, ""),
        reference: refMatch[1].trim(),
        phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, "") : undefined,
        document: docMatch ? docMatch[1].trim() : undefined
      };
    }
  }

  // 2. Banesco (SMS o Push App)
  // Ejemplo: "Banesco: Recibio Pago Movil de V12345678 por Bs 150,00 Ref: 98765432"
  if (
    sender.toLowerCase().includes("banesco") ||
    sender === "com.banesco.banescovenezuela" ||
    cleanMsg.toUpperCase().includes("BANESCO")
  ) {
    const amountMatch = cleanMsg.match(/Bs\s*([\d,.]+)/i);
    const refMatch = cleanMsg.match(/Ref\s*:?\s*(\d+)/i) || cleanMsg.match(/Referencia:\s*(\d+)/i);
    const phoneMatch = cleanMsg.match(/(?:Cel\.|del|de)\s*(0?\d{3}-?\d{7})/i);
    const docMatch = cleanMsg.match(/\b([VEve]-?\d{5,10})\b/i);
    if (amountMatch && refMatch) {
      return {
        amountRaw: amountMatch[1].replace(/[.,]+$/, ""),
        reference: refMatch[1].trim(),
        phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, "") : undefined,
        document: docMatch ? docMatch[1].trim() : undefined
      };
    }
  }

  // 3. Mercantil (SMS o Push App)
  // Ejemplo: "Monto de Bs. 150,00 de V-12345678 Ref: 98765432"
  if (
    sender.toLowerCase().includes("mercantil") ||
    sender === "com.mercantil.movil" ||
    sender === "com.mercantil.banco.personas" ||
    sender === "com.mercantil.banco.empresas" ||
    sender === "com.mercantilbanco.mercantilmovil"
  ) {
    const amountMatch = cleanMsg.match(/Bs\.?\s*([\d,.]+)/i) || cleanMsg.match(/monto de\s*([\d,.]+)/i);
    const refMatch = cleanMsg.match(/Ref\s*:?\s*(\d+)/i) || cleanMsg.match(/referencia\s*(\d+)/i);
    const phoneMatch = cleanMsg.match(/(?:Cel\.|del|de)\s*(0?\d{3}-?\d{7})/i);
    const docMatch = cleanMsg.match(/\b([VEve]-?\d{5,10})\b/i);
    if (amountMatch && refMatch) {
      return {
        amountRaw: amountMatch[1].replace(/[.,]+$/, ""),
        reference: refMatch[1].trim(),
        phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, "") : undefined,
        document: docMatch ? docMatch[1].trim() : undefined
      };
    }
  }

  // 4. BBVA Provincial (SMS o Push App)
  if (
    sender.toLowerCase().includes("provincial") ||
    sender === "com.bbva.provincial.ve" ||
    sender === "com.dinerorapido.bancamovil" ||
    sender === "77107" ||
    cleanMsg.toUpperCase().includes("PROVINCIAL")
  ) {
    const amountMatch = cleanMsg.match(/Bs\.?\s*([\d,.]+)/i) || cleanMsg.match(/monto de\s*([\d,.]+)/i);
    const refMatch = cleanMsg.match(/Ref\s*:?\s*(\d+)/i) || cleanMsg.match(/referencia\s*(\d+)/i);
    const phoneMatch = cleanMsg.match(/(?:Cel\.|del|de)\s*(0?\d{3}-?\d{7})/i);
    const docMatch = cleanMsg.match(/\b([VEve]-?\d{5,10})\b/i);
    if (amountMatch && refMatch) {
      return {
        amountRaw: amountMatch[1].replace(/[.,]+$/, ""),
        reference: refMatch[1].trim(),
        phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, "") : undefined,
        document: docMatch ? docMatch[1].trim() : undefined
      };
    }
  }

  // Fallback genérico para otros bancos
  const amountMatch = cleanMsg.match(/(?:Bs\.?|monto|monto de)\s*([\d,.]+)/i);
  const refMatch = cleanMsg.match(/(?:Ref|Referencia|Ref\.|nro|operaci[oó]n)\s*:?\s*(\d+)/i);
  const phoneMatch = cleanMsg.match(/(?:Cel\.|del|de)\s*(0?\d{3}-?\d{7})/i);
  const docMatch = cleanMsg.match(/\b([VEve]-?\d{5,10})\b/i);
  if (amountMatch && refMatch) {
    return {
      amountRaw: amountMatch[1].replace(/[.,]+$/, ""),
      reference: refMatch[1].trim(),
      phone: phoneMatch ? phoneMatch[1].replace(/[-\s]/g, "") : undefined,
      document: docMatch ? docMatch[1].trim() : undefined
    };
  }

  return null;
}

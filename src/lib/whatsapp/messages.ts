import { getTemplateByKey } from "@/db/queries/whatsapp-templates";
import { formatBs, formatRef } from "@/lib/money";
import { sendMessage } from "./client";
import {
  formatItemsDetailed,
  type SnapshotItem,
} from "@/lib/utils/format-items-detailed";

interface TemplateVariables {
  nombre: string;
  numeroPedido: string;
  items: string;
  total: string;
  baseImponible: string;
  iva: string;
  ref: string;
  tiempoEstimado: string;
}

function renderTemplate(body: string, vars: TemplateVariables): string {
  return body
    .replace(/\{nombre\}/g, vars.nombre)
    .replace(/\{numeroPedido\}/g, vars.numeroPedido)
    .replace(/\{items\}/g, vars.items)
    .replace(/\{total\}/g, vars.total)
    .replace(/\{baseImponible\}/g, vars.baseImponible)
    .replace(/\{iva\}/g, vars.iva)
    .replace(/\{ref\}/g, vars.ref)
    .replace(/\{tiempoEstimado\}/g, vars.tiempoEstimado);
}

export async function sendOrderMessage(
  templateKey: string,
  phone: string,
  orderNumber: string,
  customerName: string | null,
  items: SnapshotItem[],
  totalBsCents: number,
  estimatedMinutes?: number,
  baseUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  const template = await getTemplateByKey(templateKey);
  if (!template || !template.isActive) {
    return { success: true };
  }

  const totalBs = totalBsCents;
  const baseImponible = Math.round(totalBs / 1.16);
  const iva = totalBs - baseImponible;

  // Calculate total REF from snapshot items (sum all priceUsdCents)
  let totalUsdCents = 0;
  for (const item of items) {
    // Base price * quantity
    totalUsdCents += item.priceUsdCents * item.quantity;
    // Contornos fijos
    for (const c of item.fixedContornos) {
      totalUsdCents += c.priceUsdCents * item.quantity;
    }
    // Adicionales (incluye sustituciones)
    for (const a of item.selectedAdicionales) {
      totalUsdCents += a.priceUsdCents * (a.quantity ?? 1) * item.quantity;
    }
    // Bebidas
    for (const b of item.selectedBebidas ?? []) {
      totalUsdCents += b.priceUsdCents * (b.quantity ?? 1) * item.quantity;
    }
    // Removidos (descuento, priceUsdCents es negativo)
    for (const r of item.removedComponents ?? []) {
      totalUsdCents += r.priceUsdCents * item.quantity;
    }
  }

  const vars: TemplateVariables = {
    nombre: customerName || "cliente",
    numeroPedido: `#${orderNumber}`,
    items: formatItemsDetailed(items, formatBs, formatRef),
    total: formatBs(totalBs),
    baseImponible: formatBs(baseImponible),
    iva: formatBs(iva),
    ref: formatRef(totalUsdCents),
    tiempoEstimado: estimatedMinutes ? `${estimatedMinutes} min` : "pronto",
  };

  const message = renderTemplate(template.body, vars);
  // 04141234567 → 584141234567 (strip leading 0, prefix 58 for Venezuela)
  const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "");
  const formattedPhone = cleanPhone.startsWith("58")
    ? cleanPhone
    : `58${cleanPhone}`;

  const result = await sendMessage(formattedPhone, message, baseUrl);
  return result;
}


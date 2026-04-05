import { getTemplateByKey } from "@/db/queries/whatsapp-templates";
import { formatBs, formatRef } from "@/lib/money";
import { sendMessage } from "./client";
import {
  formatItemsDetailed,
  type SnapshotItem,
} from "@/lib/utils/format-items-detailed";

// ─── Template variable system ─────────────────────────────────────────────────

interface TemplateVariables {
  nombre: string;
  numeroPedido: string;
  items: string;
  total: string;
  baseImponible: string;
  iva: string;
  ref: string;
  tiempoEstimado: string;
  modoPedido: string;
  telefono: string;
  restaurantName: string;
  // Surcharges — opcionales para backward compatibility con templates existentes
  packagingFee?: string;
  deliveryFee?: string;
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
    .replace(/\{tiempoEstimado\}/g, vars.tiempoEstimado)
    .replace(/\{modoPedido\}/g, vars.modoPedido)
    .replace(/\{telefono\}/g, vars.telefono)
    .replace(/\{restaurantName\}/g, vars.restaurantName)
    .replace(/\{packagingFee\}/g, vars.packagingFee ?? "")
    .replace(/\{deliveryFee\}/g, vars.deliveryFee ?? "");
}

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface SurchargesInfo {
  packagingUsdCents: number;
  deliveryUsdCents: number;
  rate: number;
  orderMode?: string | null;
}

/**
 * Contexto unificado para construir cualquier mensaje de WhatsApp.
 * Single source of truth — todos los callers (checkout, admin status,
 * confirm-manual, whatsapp-manual provider) usan este mismo objeto.
 */
export interface OrderMessageContext {
  templateKey: string;
  phone: string;
  orderNumber: string;
  customerName: string | null;
  items: SnapshotItem[];
  /** SIEMPRE el total final (subtotal + surcharges) */
  grandTotalBsCents: number;
  surcharges?: SurchargesInfo | null;
  estimatedMinutes?: number;
  baseUrl?: string;
  restaurantName?: string;
}

// ─── Order mode labels ────────────────────────────────────────────────────────

const ORDER_MODE_LABELS: Record<string, string> = {
  on_site: "🏠 Comer en el local",
  take_away: "📦 Retira en el local",
  delivery: "🛵 Delivery",
};

// ─── Core: build message string ───────────────────────────────────────────────

/**
 * Construye el string del mensaje renderizado con la template de DB.
 * NO envía nada — función pura que retorna el texto.
 *
 * Usada internamente por `sendOrderMessage()` y externamente por
 * `WhatsAppManualProvider.initiatePayment()` para el waLink.
 *
 * Retorna `null` si la template no existe o está inactiva.
 */
export async function buildOrderMessage(
  ctx: OrderMessageContext,
): Promise<string | null> {
  const template = await getTemplateByKey(ctx.templateKey);
  if (!template || !template.isActive) {
    return null;
  }

  const totalBs = ctx.grandTotalBsCents;
  const baseImponible = Math.round(totalBs / 1.16);
  const iva = totalBs - baseImponible;

  // Calculate total REF from snapshot items (sum all priceUsdCents)
  let totalUsdCents = 0;
  for (const item of ctx.items) {
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

  // Add surcharges to REF total if available
  if (ctx.surcharges) {
    totalUsdCents += ctx.surcharges.packagingUsdCents + ctx.surcharges.deliveryUsdCents;
  }

  const vars: TemplateVariables = {
    nombre: ctx.customerName || "cliente",
    numeroPedido: `#${ctx.orderNumber}`,
    items: formatItemsDetailed(ctx.items, formatBs, formatRef),
    total: formatBs(totalBs),
    baseImponible: formatBs(baseImponible),
    iva: formatBs(iva),
    ref: formatRef(totalUsdCents),
    tiempoEstimado: ctx.estimatedMinutes ? `${ctx.estimatedMinutes} min` : "pronto",
    modoPedido: ctx.surcharges?.orderMode
      ? ORDER_MODE_LABELS[ctx.surcharges.orderMode] ?? ctx.surcharges.orderMode
      : "",
    telefono: ctx.phone,
    restaurantName: ctx.restaurantName ?? "",
    packagingFee: ctx.surcharges && ctx.surcharges.packagingUsdCents > 0
      ? formatBs(Math.round(ctx.surcharges.packagingUsdCents * ctx.surcharges.rate))
      : undefined,
    deliveryFee: ctx.surcharges && ctx.surcharges.deliveryUsdCents > 0
      ? formatBs(Math.round(ctx.surcharges.deliveryUsdCents * ctx.surcharges.rate))
      : undefined,
  };

  return renderTemplate(template.body, vars);
}

// ─── Send: build + dispatch via microservice ──────────────────────────────────

/**
 * Construye y envía un mensaje WhatsApp al cliente usando la template de DB.
 * Wrapper de `buildOrderMessage()` + `sendMessage()`.
 */
export async function sendOrderMessage(
  ctx: OrderMessageContext,
): Promise<{ success: boolean; error?: string }> {
  const message = await buildOrderMessage(ctx);
  if (!message) {
    // Template not found or inactive — skip silently
    return { success: true };
  }

  // 04141234567 → 584141234567 (strip leading 0, prefix 58 for Venezuela)
  const cleanPhone = ctx.phone.replace(/\D/g, "").replace(/^0/, "");
  const formattedPhone = cleanPhone.startsWith("58")
    ? cleanPhone
    : `58${cleanPhone}`;

  return sendMessage(formattedPhone, message, ctx.baseUrl);
}

import { getTemplateByKey } from "@/db/queries/whatsapp-templates";
import { getCustomerByPhone } from "@/db/queries/customers";
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
  orderRef?: string;
  metodoPago?: string;
  direccion?: string;
  ubicacionGps?: string;
}

function renderTemplate(body: string, vars: TemplateVariables): string {
  let rendered = body
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

  // Nuevos placeholders con comportamiento defensivo (si es undefined, no se reemplaza)
  if (vars.orderRef !== undefined) {
    rendered = rendered.replace(/\{orderRef\}/g, vars.orderRef);
  }
  if (vars.metodoPago !== undefined) {
    rendered = rendered.replace(/\{metodoPago\}/g, vars.metodoPago);
  }
  if (vars.direccion !== undefined) {
    rendered = rendered.replace(/\{direccion\}/g, vars.direccion);
  }
  if (vars.ubicacionGps !== undefined) {
    rendered = rendered.replace(/\{ubicacionGps\}/g, vars.ubicacionGps);
  }

  return rendered;
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
  orderId?: string;
  orderNumber: string;
  customerName: string | null;
  items: SnapshotItem[];
  paymentMethod?: string | null;
  /** SIEMPRE el total final (subtotal + surcharges) */
  grandTotalBsCents: number;
  surcharges?: SurchargesInfo | null;
  estimatedMinutes?: number;
  baseUrl?: string;
  restaurantName?: string;
  deliveryAddress?: string | null;
  gpsCoords?: { lat: number; lng: number; accuracy?: number } | null;
}

// ─── Order mode labels ────────────────────────────────────────────────────────

const ORDER_MODE_LABELS: Record<string, string> = {
  on_site: "🏠 Comer en el local",
  take_away: "📦 Retira en el local",
  delivery: "🛵 Delivery",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pago_movil: "💰 Pago Móvil",
  transfer: "🏦 Transferencia",
  whatsapp: "💬 Acordado por WhatsApp",
  cash: "💵 Efectivo",
  pos: "💳 Punto de Venta",
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

  // Fallback: Si el nombre no viene en el contexto, intentamos buscarlo en DB
  let customerName = ctx.customerName;
  if (!customerName) {
    // Normalizar a formato interno (0414...) para el lookup en DB
    const normalizedPhone = ctx.phone.replace(/\D/g, "").replace(/^58/, "0");
    const customer = await getCustomerByPhone(normalizedPhone);
    customerName = customer?.name ?? null;
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
      totalUsdCents += a.priceUsdCents * (a.quantity ?? 1);
    }
    // Bebidas
    for (const b of item.selectedBebidas ?? []) {
      totalUsdCents += b.priceUsdCents * (b.quantity ?? 1);
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
    nombre: customerName || "cliente",
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
    orderRef: ctx.orderId ? ctx.orderId.slice(0, 8).toUpperCase() : undefined,
    metodoPago: ctx.paymentMethod
      ? PAYMENT_METHOD_LABELS[ctx.paymentMethod] ?? ctx.paymentMethod
      : undefined,
    direccion: ctx.deliveryAddress || undefined,
    ubicacionGps: ctx.gpsCoords
      ? `https://maps.google.com/?q=${ctx.gpsCoords.lat.toFixed(6)},${ctx.gpsCoords.lng.toFixed(6)}`
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

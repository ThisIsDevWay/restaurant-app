import { formatBs, formatRef, usdCentsToBsCents } from "@/lib/money";
import { isRealPhone } from "@/lib/utils";
import type { orders } from "@/db/schema";
import type { PrinterTarget } from "@/lib/print/printer-target";

type OrderRow = typeof orders.$inferSelect;
type SnapshotItem = NonNullable<OrderRow["itemsSnapshot"]>[number];

export interface BuildTicketOpts {
  restaurantName?: string;
  waiterName?: string;
  isUpdate?: boolean;
  /** Fecha a mostrar; por defecto la de creación de la orden. */
  date?: Date;
}

const WIDTH = 48; // 80mm, Font A = 48 chars/línea
const LINE = "-".repeat(WIDTH);

const PAYMENT_LABELS: Record<string, string> = {
  cash: "EFECTIVO",
  cash_usd: "EFECTIVO $",
  cash_bs: "EFECTIVO BS",
  pago_movil: "PAGO MOVIL",
  pos: "PUNTO / POS",
  zelle: "ZELLE",
  transfer: "TRANSFER",
  binance: "BINANCE",
  whatsapp: "WHATSAPP",
  "Efectivo $": "EFECTIVO $",
  "Efectivo Bs": "EFECTIVO BS",
  "Pago Móvil": "PAGO MOVIL",
  "Punto / PdV": "PUNTO / POS",
  Zelle: "ZELLE",
  "Transf.": "TRANSFER",
  Binance: "BINANCE",
};

function sanitize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x00-\x7F]/g, "?");
}
function center(text: string): string {
  const str = text.length > WIDTH ? text.substring(0, WIDTH) : text;
  const spaces = Math.max(0, Math.floor((WIDTH - str.length) / 2));
  return " ".repeat(spaces) + str;
}
function justify(left: string, right: string): string {
  const l = String(left);
  const r = String(right);
  if (l.length + r.length >= WIDTH) {
    const maxL = Math.max(0, WIDTH - r.length - 1);
    return l.substring(0, maxL) + " " + r;
  }
  return l + " ".repeat(WIDTH - (l.length + r.length)) + r;
}
function limit(text: string): string {
  return text.substring(0, WIDTH);
}

/** Importe en Bs con su referencia USD entre paréntesis. NO altera el formato de REF. */
function bsWithRef(bsCents: number, usdCents: number): string {
  return `${formatBs(bsCents)} (${formatRef(usdCents)})`;
}

function formatTicketDate(d: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const period = get("dayPeriod").replace(/\./g, "").replace(/\s/g, "").trim().toUpperCase();
  return {
    date: `${get("day")}/${get("month")}/${get("year")}`,
    time: period ? `${get("hour")}:${get("minute")} ${period}` : `${get("hour")}:${get("minute")}`,
  };
}

/** Ítems del pedido que corresponden a esta impresora, según `profile.items`. */
export function selectItemsForProfile(order: OrderRow, profile: PrinterTarget): {
  items: SnapshotItem[];
  includeFood: boolean;
  includeDrinks: boolean;
} {
  const all = (order.itemsSnapshot ?? []) as SnapshotItem[];
  const mode = profile.items.mode;

  if (profile.station === "kitchen") {
    // Cocina: excluir bebidas totalmente (tanto standalone como de sub-ítems) a menos que includeDrinks esté activo
    const shouldIncludeDrinks = !!profile.items.includeDrinks;
    const foodItems = shouldIncludeDrinks
      ? all
      : all.filter((i) => !i.categoryName?.toLowerCase().includes("bebida"));
    return { items: foodItems, includeFood: true, includeDrinks: shouldIncludeDrinks };
  }

  if (mode === "drinks") {
    // Barra: incluir standalone bebidas o cualquier plato con sub-bebidas
    const drinkItems = all.filter(
      (i) => i.categoryName?.toLowerCase().includes("bebida") || (i.selectedBebidas?.length ?? 0) > 0
    );
    return { items: drinkItems, includeFood: false, includeDrinks: true };
  }

  if (mode === "categories") {
    const set = new Set(profile.items.categoryIds);
    return { items: all.filter((i) => i.categoryId != null && set.has(i.categoryId)), includeFood: true, includeDrinks: true };
  }

  return { items: all, includeFood: true, includeDrinks: true };
}

/** ¿Esta impresora produciría contenido para este pedido? Si no, se omite el job. */
export function ticketHasContent(order: OrderRow, profile: PrinterTarget): boolean {
  const { items, includeDrinks } = selectItemsForProfile(order, profile);
  if (items.length === 0) return false;
  if (profile.items.mode === "drinks") {
    return items.some(
      (i) => i.categoryName?.toLowerCase().includes("bebida") || (includeDrinks && (i.selectedBebidas?.length ?? 0) > 0)
    );
  }
  return true;
}

export function buildTicket(order: OrderRow, profile: PrinterTarget, opts: BuildTicketOpts = {}): string {
  const s = profile.sections;
  const showPrices = s.totals;
  const { items, includeFood, includeDrinks } = selectItemsForProfile(order, profile);
  const rate = Number(order.rateSnapshotBsPerUsd) || 0;

  // Tipo de ticket según estación.
  const ticketTitle =
    profile.station === "cashier" ? (opts.isUpdate ? "RECIBO (ACT.)" : "RECIBO")
    : profile.station === "bar" ? (opts.isUpdate ? "BARRA (ACT.)" : "BARRA")
    : opts.isUpdate ? "COMANDA ACTUALIZADA" : "COMANDA";

  let text = "";

  // ── HEADER ──
  if (s.header) {
    if (opts.restaurantName) text += center(sanitize(opts.restaurantName).toUpperCase()) + "\n";
    text += center(ticketTitle) + "\n";
    text += LINE + "\n";
  }

  // ── ORDER META ──
  if (s.orderMeta) {
    const { date, time } = formatTicketDate(opts.date ?? new Date(order.createdAt));
    const leftDate = `${date} ${time}`;

    if (showPrices && order.paymentMethod) {
      const method = PAYMENT_LABELS[order.paymentMethod] || "PENDIENTE";
      text += justify(`ORDEN #${order.orderNumber}`, `PAGO: ${method}`) + "\n";
    } else {
      text += justify(`ORDEN #${order.orderNumber}`, "") + "\n";
    }

    if (showPrices && order.paymentReference) {
      text += justify(`${leftDate}    COMPROBANTE:`, sanitize(order.paymentReference)) + "\n";
    } else {
      text += justify(leftDate, "") + "\n";
    }

    if (opts.waiterName) text += center(`MESERO: ${sanitize(opts.waiterName).toUpperCase()}`) + "\n";
  }

  // ── LOCATION (nombre + mesa + modo) ──
  if (s.location) {
    const mesa = order.tableNumber ? `MESA: ${sanitize(order.tableNumber).toUpperCase()}` : "";
    const cliente = order.customerName ? `CLIENTE: ${sanitize(order.customerName).toUpperCase()}` : "";
    if (mesa || cliente) {
      text += justify(mesa, cliente) + "\n";
    }

    if (order.orderMode) {
      const modeStr =
        order.orderMode === "on_site" ? "PARA CONSUMIR" : order.orderMode === "take_away" ? "PARA LLEVAR" : "DELIVERY";
      text += center(`*** ${modeStr} ***`) + "\n";
    }
  }

  // ── CONTACT DATA (solo caja) ──
  if (s.contactData) {
    if (isRealPhone(order.customerPhone)) {
      text += `TEL: ${order.customerPhone}` + "\n";
    }
    if (order.orderMode === "delivery") {
      const zone = (order.surchargesSnapshot as { deliveryZoneLabel?: string } | null)?.deliveryZoneLabel;
      if (zone) text += `ZONA: ${sanitize(zone).toUpperCase()}` + "\n";
      if (order.deliveryAddress) {
        for (const chunk of wrap(`DIR: ${sanitize(order.deliveryAddress)}`, WIDTH)) text += chunk + "\n";
      }
    }
  }

  if (s.header || s.orderMeta || s.location || s.contactData) text += LINE + "\n";

  // ── ÍTEMS ──
  for (const item of items) {
    const isDrinkItem = item.categoryName?.toLowerCase().includes("bebida");

    if (includeFood) {
      text += renderFoodItem(item, showPrices, includeDrinks);
    } else {
      // Modo "solo bebidas" (ej. Barra)
      if (isDrinkItem) {
        // Bebida standalone
        const qtyName = `${item.quantity}x ${sanitize(item.name).toUpperCase()}`;
        if (showPrices) {
          const price = formatBs(item.itemTotalBsCents);
          text += justify(qtyName, price) + "\n";
        } else {
          text += limit(qtyName) + "\n";
        }
      } else if (includeDrinks && (item.selectedBebidas?.length ?? 0) > 0) {
        // Agrupar bebidas por plato para dar contexto a la barra
        text += limit(sanitize(item.name).toUpperCase()) + "\n";
        text += renderDrinks(item, showPrices, "  ");
      }
    }
  }

  // ── CANTIDAD DE ARTÍCULOS (en comandas de producción) ──
  if (!showPrices) {
    const totalQty = items.reduce((sum, i) => {
      const isDrinkItem = i.categoryName?.toLowerCase().includes("bebida");
      let n = (includeFood || isDrinkItem) ? i.quantity : 0;
      if (includeDrinks) n += (i.selectedBebidas ?? []).reduce((a, b) => a + (b.quantity ?? 1) * i.quantity, 0);
      if (includeFood) {
        n += (i.selectedAdicionales ?? [])
          .filter((a) => !a.substitutesComponentId)
          .reduce((a, ad) => a + (ad.quantity ?? 1) * i.quantity, 0);
      }
      return sum + n;
    }, 0);
    text += LINE + "\n";
    text += justify("CANT. ARTICULOS:", String(totalQty)) + "\n";
  }

  // ── TOTALES + RECARGOS (recibo de caja) ──
  if (s.totals || s.surcharges) {
    text += LINE + "\n";
  }
  if (s.totals) {
    text += justify("SUBTOTAL:", bsWithRef(order.subtotalBsCents, order.subtotalUsdCents)) + "\n";
  }
  if (s.surcharges) {
    if (order.packagingUsdCents > 0) {
      text += justify("EMPAQUE:", bsWithRef(usdCentsToBsCents(order.packagingUsdCents, rate), order.packagingUsdCents)) + "\n";
    }
    if (order.deliveryUsdCents > 0) {
      text += justify("DELIVERY:", bsWithRef(usdCentsToBsCents(order.deliveryUsdCents, rate), order.deliveryUsdCents)) + "\n";
    }
    if (order.igtfBsCents > 0) {
      text += justify("IGTF:", bsWithRef(order.igtfBsCents, order.igtfUsdCents)) + "\n";
    }
  }
  if (s.totals) {
    text += justify("TOTAL:", bsWithRef(order.grandTotalBsCents, order.grandTotalUsdCents)) + "\n";
  }

  text += "\n"; // espacio mínimo para el corte (el agente añade el corte)
  return text;
}

// ── helpers de render ──

function renderFoodItem(item: SnapshotItem, showPrices: boolean, includeDrinks = true): string {
  let text = "";
  const qtyName = `${item.quantity}x ${sanitize(item.name).toUpperCase()}`;
  if (showPrices) {
    const price = formatBs(item.itemTotalBsCents);
    if (qtyName.length + price.length + 1 > WIDTH) {
      text += limit(qtyName) + "\n" + justify("", price) + "\n";
    } else {
      text += justify(qtyName, price) + "\n";
    }
  } else {
    text += limit(qtyName) + "\n";
  }

  for (const c of item.fixedContornos ?? []) {
    text += limit(` > ${sanitize(c.name)}`) + "\n";
  }
  if (item.includedNote) text += limit(` (${sanitize(item.includedNote)})`) + "\n";

  for (const r of item.removedComponents ?? []) {
    text += limit(` [SIN ${sanitize(r.name).toUpperCase()}]`) + "\n";
  }

  for (const a of item.selectedAdicionales ?? []) {
    if (a.substitutesComponentName) {
      text += limit(` ~ ${sanitize(a.name)} (POR ${sanitize(a.substitutesComponentName).toUpperCase()})`) + "\n";
    } else {
      const label = ` * ${a.quantity ?? 1}x ${sanitize(a.name)}`;
      text += limit(label) + "\n";
    }
  }

  // Bebidas que cuelgan del plato (en tickets con comida).
  if (includeDrinks) {
    text += renderDrinks(item, showPrices, " ");
  }
  return text;
}

function renderDrinks(item: SnapshotItem, _showPrices: boolean, indent: string): string {
  let text = "";
  for (const b of item.selectedBebidas ?? []) {
    text += limit(`${indent}* ${b.quantity ?? 1}x ${sanitize(b.name)}`) + "\n";
  }
  return text;
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > width) {
    out.push(rest.substring(0, width));
    rest = rest.substring(width);
  }
  if (rest) out.push(rest);
  return out;
}

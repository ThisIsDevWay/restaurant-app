import { formatBs, formatRef } from "./money";

interface PrintData {
  orderNumber: number;
  tableNumber: string;
  customerName?: string;
  items: any[];
  totalBsCents: number;
  totalUsdCents: number;
  date: string;
  paymentMethod?:
    | "pago_movil"
    | "transfer"
    | "whatsapp"
    | "cash"
    | "cash_usd"
    | "cash_bs"
    | "pos"
    | "zelle"
    | "binance";
  waiterName?: string;
  orderMode?: string;
  restaurantName?: string;
}

export function generateTicketText(data: PrintData): string {
  const width = 32; // Standard 58mm width approx 32 chars
  const line = "-".repeat(width);
  const doubleLine = "=".repeat(width);
  
  const center = (text: string) => {
    const spaces = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(spaces) + text;
  };

  const justify = (left: string, right: string) => {
    const spaces = Math.max(0, width - (left.length + right.length));
    return left + " ".repeat(spaces) + right;
  };

  const [datePart, timePart] = data.date.split(", ");

  let text = "";
  text += center(data.restaurantName?.toUpperCase() || " ") + "\n";
  text += center("COMANDA") + "\n";
  text += line + "\n";
  
  // Info Line 1: Order # and Payment
  const methodMap: Record<string, string> = {
    cash: "EFECTIVO",
    cash_usd: "EFECTIVO $",
    cash_bs: "EFECTIVO BS",
    pago_movil: "PAGO MOVIL",
    pos: "PUNTO / POS",
    zelle: "ZELLE",
    transfer: "TRANSFER",
    binance: "BINANCE",
    whatsapp: "WHATSAPP",
  };
  const methodStr = methodMap[data.paymentMethod || ""] || "PENDIENTE";
  text += justify(`#${data.orderNumber}`, `PAGO: ${methodStr}`) + "\n";
  
  // Info Line 2: Date and Time
  text += justify(datePart, timePart || "") + "\n";
  
  if (data.waiterName) {
    text += center(`MESERO: ${data.waiterName.toUpperCase()}`) + "\n";
  }
  
  if (data.tableNumber || data.customerName) {
    const mesaLabel = data.tableNumber ? `MESA: ${data.tableNumber}` : "";
    const clienteLabel = data.customerName ? `CLIENTE: ${data.customerName.toUpperCase()}` : "";
    
    if (mesaLabel && clienteLabel) {
      text += justify(mesaLabel, clienteLabel) + "\n";
    } else {
      text += center(mesaLabel || clienteLabel) + "\n";
    }
  }

  if (data.orderMode) {
    const modeStr = data.orderMode === "on_site" ? "PARA CONSUMIR" : 
                    data.orderMode === "take_away" ? "PARA LLEVAR" : "DELIVERY";
    text += center(`*** ${modeStr} ***`) + "\n";
  }
  
  text += line + "\n";

  const formatVal = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

  data.items.forEach((item: any) => {
    const qtyName = `${item.quantity}x ${item.name.toUpperCase()}`;
    const priceStr = formatVal(item.priceUsdCents * item.quantity);
    
    // Split name and price if too long, or justify
    if (qtyName.length + priceStr.length + 2 > width) {
      text += qtyName + "\n";
      text += justify("", priceStr) + "\n";
    } else {
      text += justify(qtyName, priceStr) + "\n";
    }
    
    // Modifiers (indented and compact)
    if (item.selectedContorno) {
      text += ` > ${item.selectedContorno.name}\n`;
    }
    
    item.fixedContornos?.forEach((c: any) => {
      text += ` > ${c.name}\n`;
    });
    
    if (item.includedNote) {
      text += ` (${item.includedNote})\n`;
    }

    item.removedComponents?.forEach((r: any) => {
      text += ` [SIN ${r.name.toUpperCase()}]\n`;
    });

    item.selectedAdicionales?.forEach((a: any) => {
      if (a.substitutesComponentName) {
        text += ` ~ ${a.name} (POR ${a.substitutesComponentName.toUpperCase()})\n`;
      } else {
        const label = ` + ${a.quantity}x ${a.name}`;
        const price = a.priceUsdCents * (a.quantity || 1) * item.quantity;
        if (price > 0) {
          text += justify(label, formatVal(price)) + "\n";
        } else {
          text += `${label}\n`;
        }
      }
    });

    item.selectedBebidas?.forEach((b: any) => {
      const label = ` * ${b.quantity}x ${b.name}`;
      const price = b.priceUsdCents * (b.quantity || 1) * item.quantity;
      if (price > 0) {
        text += justify(label, formatVal(price)) + "\n";
      } else {
        text += `${label}\n`;
      }
    });
  });

  text += line + "\n";
  
  const totalQty = data.items.reduce((sum: number, i: any) => {
    let itemSum = i.quantity;
    if (i.selectedAdicionales) {
      // Don't count substitutions as new articles, only true adicionales
      itemSum += i.selectedAdicionales
        .filter((a: any) => !a.substitutesComponentId)
        .reduce((s: number, a: any) => s + (a.quantity || 1) * i.quantity, 0);
    }
    if (i.selectedBebidas) {
      itemSum += i.selectedBebidas.reduce((s: number, b: any) => s + (b.quantity || 1) * i.quantity, 0);
    }
    return sum + itemSum;
  }, 0);

  text += justify("CANT. ARTICULOS:", String(totalQty)) + "\n";
  text += line + "\n";
  
  // Calculate financial breakdown (assuming totals are tax-inclusive)
  const ivaFactor = 0.16;
  const totalBs = data.totalBsCents;
  const totalUsd = data.totalUsdCents;
  
  const baseBs = Math.round(totalBs / (1 + ivaFactor));
  const baseUsd = Math.round(totalUsd / (1 + ivaFactor));
  const ivaBs = totalBs - baseBs;
  const ivaUsd = totalUsd - baseUsd;

  const subtotalBsStr = formatBs(baseBs).replace("Bs. ", "Bs ");
  const subtotalRefStr = `(${formatRef(baseUsd)})`;
  text += justify("SUBTOTAL:", `${subtotalBsStr} ${subtotalRefStr}`) + "\n";

  const ivaBsStr = formatBs(ivaBs).replace("Bs. ", "Bs ");
  const ivaRefStr = `(${formatRef(ivaUsd)})`;
  text += justify("IVA (16%):", `${ivaBsStr} ${ivaRefStr}`) + "\n";

  // Unify totals in a single line
  const bsStr = formatBs(totalBs).replace("Bs. ", "Bs ");
  const totalsStr = `${bsStr} (${formatRef(totalUsd)})`;
  text += justify("TOTAL:", totalsStr) + "\n";
  text += "\n\n\n"; // Minimal space for cutting
  
  return text;
}

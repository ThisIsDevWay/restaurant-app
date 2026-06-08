/**
 * Modelo compartido de "impresora local" (print target) y sus perfiles.
 *
 * Una impresora pertenece a un lugar (`station`) y define qué ítems imprime
 * (`items`) y qué secciones del ticket muestra (`sections`). Esto permite, por
 * ejemplo, que la barra imprima solo café/postres/bebidas sin precios, mientras
 * caja imprime el recibo completo con totales y datos de contacto.
 *
 * El campo `name` sigue siendo doble propósito (igual que hoy): nombre de la
 * impresora en Windows + filtro de sondeo del agente Go. El resto es solo del
 * lado de la app.
 */

export type PrinterStation = "kitchen" | "cashier" | "bar" | "other";

/** Qué ítems del pedido imprime esta estación. */
export interface PrinterItemSelection {
  /** "all" = todo; "drinks" = solo bebidas; "categories" = ítems por categoría. */
  mode: "all" | "drinks" | "categories";
  /** Categorías a incluir cuando `mode === "categories"` (vacío en los demás). */
  categoryIds: string[];
  /** Indica si se incluyen bebidas en la impresión (particularmente para cocina). */
  includeDrinks?: boolean;
}

/** Qué secciones imprime esta estación. */
export interface PrinterSections {
  header: boolean;       // nombre del restaurante + tipo de ticket
  orderMeta: boolean;    // #orden, fecha/hora, mesero
  location: boolean;     // nombre cliente + mesa + modo
  contactData: boolean;  // teléfono + dirección delivery + cédula (solo caja)
  totals: boolean;       // subtotal + total (con precios en los ítems)
  surcharges: boolean;   // empaque + delivery + IGTF
}

export interface PrinterTarget {
  name: string;
  station: PrinterStation;
  items: PrinterItemSelection;
  sections: PrinterSections;
  copies: number;
  reprintCopies: number;
  enabled: boolean;
}

export const PRINTER_STATIONS: { value: PrinterStation; label: string }[] = [
  { value: "kitchen", label: "Cocina" },
  { value: "cashier", label: "Caja" },
  { value: "bar", label: "Barra" },
  { value: "other", label: "Otro" },
];

/** Presets por estación: pre-rellenan `items` + `sections` (editables en la UI). */
export const STATION_PRESETS: Record<PrinterStation, { items: PrinterItemSelection; sections: PrinterSections }> = {
  kitchen: {
    items: { mode: "all", categoryIds: [], includeDrinks: false },
    sections: { header: true, orderMeta: true, location: true, contactData: false, totals: false, surcharges: false },
  },
  bar: {
    items: { mode: "drinks", categoryIds: [], includeDrinks: true },
    sections: { header: true, orderMeta: true, location: true, contactData: false, totals: false, surcharges: false },
  },
  cashier: {
    items: { mode: "all", categoryIds: [], includeDrinks: true },
    sections: { header: true, orderMeta: true, location: true, contactData: true, totals: true, surcharges: true },
  },
  other: {
    items: { mode: "all", categoryIds: [], includeDrinks: true },
    sections: { header: true, orderMeta: true, location: true, contactData: false, totals: false, surcharges: false },
  },
};

/**
 * Normaliza una impresora (posiblemente con el esquema viejo
 * `{ name, copies, reprintCopies, enabled }`) al modelo completo, aplicando
 * defaults defensivos para que los registros existentes no rompan.
 */
export function normalizePrinterTarget(raw: Partial<PrinterTarget> & { name: string; copies: number; enabled: boolean }): PrinterTarget {
  const station: PrinterStation = raw.station ?? "cashier";
  const preset = STATION_PRESETS[station];
  const items = raw.items ?? { ...preset.items };
  if (items.includeDrinks === undefined) {
    items.includeDrinks = station === "kitchen" ? false : true;
  }
  return {
    name: raw.name,
    station,
    items,
    sections: raw.sections ?? { ...preset.sections },
    copies: raw.copies ?? 1,
    reprintCopies: raw.reprintCopies ?? 1,
    enabled: raw.enabled,
  };
}

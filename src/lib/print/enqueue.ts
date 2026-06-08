import { db } from "@/db";
import { printJobs } from "@/db/schema";
import type { orders } from "@/db/schema";
import { getSettings } from "@/db/queries/settings";
import {
  normalizePrinterTarget,
  type PrinterStation,
  type PrinterTarget,
} from "@/lib/print/printer-target";
import { buildTicket, ticketHasContent, type BuildTicketOpts } from "@/lib/print/build-ticket";

type OrderRow = typeof orders.$inferSelect;

const ALL_STATIONS: PrinterStation[] = ["kitchen", "cashier", "bar", "other"];
const PRODUCTION_STATIONS: PrinterStation[] = ["kitchen", "bar", "other"];

// Impresora por defecto cuando no hay ninguna configurada: imprime el ticket
// completo (todas las secciones) a "main", para cualquier disparo. Conserva el
// comportamiento de un único punto de impresión sin configuración de estaciones.
const FALLBACK_PROFILE: PrinterTarget = {
  name: "main",
  station: "cashier",
  items: { mode: "all", categoryIds: [] },
  sections: { header: true, orderMeta: true, location: true, contactData: true, totals: true, surcharges: true },
  copies: 2,
  reprintCopies: 1,
  enabled: true,
};

interface SettingsLike {
  printerTargets?: unknown;
  restaurantName?: string | null;
}

function resolveProfiles(settings: SettingsLike | null): { profiles: PrinterTarget[]; isFallback: boolean } {
  const raw = settings?.printerTargets as PrinterTarget[] | undefined;
  if (!raw || raw.length === 0) {
    return { profiles: [FALLBACK_PROFILE], isFallback: true };
  }
  const profiles = raw
    .map((p) => normalizePrinterTarget(p))
    .filter((p) => p.enabled && p.name.trim() !== "");
  return { profiles, isFallback: false };
}

interface EnqueueOptions {
  stations: PrinterStation[];
  reprint?: boolean;
  ticketOpts?: Omit<BuildTicketOpts, "restaurantName">;
}

async function enqueue(order: OrderRow, { stations, reprint, ticketOpts }: EnqueueOptions): Promise<void> {
  const settings = await getSettings();
  const { profiles, isFallback } = resolveProfiles(settings);

  // El fallback imprime para cualquier disparo; los perfiles reales se filtran
  // por estación.
  const targets = isFallback ? profiles : profiles.filter((p) => stations.includes(p.station));
  if (targets.length === 0) return;

  const opts: BuildTicketOpts = { restaurantName: settings?.restaurantName ?? undefined, ...ticketOpts };

  const jobs = targets
    .filter((p) => ticketHasContent(order, p))
    .map((p) => ({
      orderId: order.id,
      copies: reprint ? p.reprintCopies : p.copies,
      rawContent: buildTicket(order, p, opts),
      status: "pending" as const,
      target: p.name,
    }));

  if (jobs.length > 0) await db.insert(printJobs).values(jobs);
}

/** Comandas de producción (cocina/barra/otro) — al entrar el pedido a cocina. */
export async function printProductionTickets(
  order: OrderRow,
  opts: { isUpdate?: boolean; waiterName?: string } = {},
): Promise<void> {
  await enqueue(order, {
    stations: PRODUCTION_STATIONS,
    ticketOpts: { isUpdate: opts.isUpdate, waiterName: opts.waiterName },
  });
}

/** Recibo de caja — al cobrarse el pedido. */
export async function printReceipt(order: OrderRow, opts: { waiterName?: string } = {}): Promise<void> {
  await enqueue(order, { stations: ["cashier"], ticketOpts: { waiterName: opts.waiterName } });
}

/** Todos los tickets relevantes (producción + recibo). Para crear-y-cobrar y reimpresión. */
export async function printAllTickets(
  order: OrderRow,
  opts: { reprint?: boolean; waiterName?: string } = {},
): Promise<void> {
  await enqueue(order, {
    stations: ALL_STATIONS,
    reprint: opts.reprint,
    ticketOpts: { waiterName: opts.waiterName },
  });
}

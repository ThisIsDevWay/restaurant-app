/**
 * Generadores de PDF individuales por reporte.
 * Cada función produce un Blob PDF independiente con jsPDF.
 *
 * - generateSalesDetailPdf: Detalle de ventas por orden con composición.
 * - generateCashBreakdownPdf: Arqueo de caja con jerarquía método/canal/modo.
 * - generateReconciliationPdf: Auditoría de conciliación banco vs sistema.
 * - generateIgtfPdf: Transacciones individuales con IGTF.
 */

import type {
  OrderLineDetailRow,
  CashBreakdownRow,
  ReconciliationReportRow,
  IgtfTransactionRow,
  IgtfSummaryRow,
} from "@/db/queries/reports";

const RED = [187, 0, 5] as const;
const BLACK = [30, 30, 30] as const;
const GRAY = [100, 100, 100] as const;

function fmtBs(cents: number): string {
  return "Bs. " + (cents / 100).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtUsd(cents: number): string {
  return "$" + (cents / 100).toFixed(2).replace(".", ",");
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "America/Caracas",
  }).format(d);
}

interface PdfMeta {
  restaurantName: string;
  fromDate: string;
  toDate: string;
  roleLabel: string;
}

async function createDoc() {
  const { default: jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "pt", format: "letter" });
}

function printHeader(doc: any, title: string, meta: PdfMeta): number {
  const pageW = 612;
  const marginX = 40;
  let y = 40;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...RED);
  doc.text(meta.restaurantName.toUpperCase(), pageW / 2, y, { align: "center" });
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const printDate = new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" });
  doc.text(`Rango: ${meta.fromDate} al ${meta.toDate}`, marginX, y);
  doc.text(`Impreso: ${printDate}`, pageW - marginX, y, { align: "right" });
  y += 10;
  doc.text(`Filtrado por: ${meta.roleLabel}`, marginX, y);
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 14;

  return y;
}

function checkPage(doc: any, y: number, needed = 60): number {
  if (y > 730 - needed) {
    doc.addPage();
    return 40;
  }
  return y;
}

function addSignatures(doc: any, y: number): void {
  const pageW = 612;
  const marginX = 40;
  y = checkPage(doc, y, 80);
  y += 30;

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(marginX + 30, y, marginX + 180, y);
  doc.line(pageW - marginX - 180, y, pageW - marginX - 30, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text("Firma del Cajero", marginX + 105, y + 12, { align: "center" });
  doc.text("Supervisor", pageW - marginX - 105, y + 12, { align: "center" });
}

// ───────────────────────────────────────────────────────────────────────────
// PDF #1 — Detalle de Ventas por Orden
// ───────────────────────────────────────────────────────────────────────────

export async function generateSalesDetailPdf(
  orders: OrderLineDetailRow[],
  meta: PdfMeta,
): Promise<Blob> {
  const doc = await createDoc();
  const marginX = 40;
  const pageW = 612;
  let y = printHeader(doc, "DETALLE DE VENTAS POR ORDEN", meta);

  // Stats row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const totalBs = orders.reduce((s, o) => s + o.grandTotalBsCents, 0);
  doc.text(`Total pedidos: ${orders.length}`, marginX, y);
  doc.text(`Facturación: ${fmtBs(totalBs)}`, pageW / 2, y, { align: "center" });
  y += 16;

  for (const order of orders) {
    y = checkPage(doc, y, 50);

    // Order header bar
    doc.setFillColor(245, 245, 245);
    doc.rect(marginX, y, pageW - marginX * 2, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(`#${order.orderNumber}`, marginX + 4, y + 11);
    doc.text(order.customerName || order.customerPhone, marginX + 50, y + 11);
    doc.text(order.channel, marginX + 200, y + 11);
    doc.text(order.orderMode, marginX + 280, y + 11);
    doc.text(order.paymentMethod, marginX + 360, y + 11);
    doc.text(fmtBs(order.grandTotalBsCents), pageW - marginX - 4, y + 11, { align: "right" });
    y += 16;

    // Items
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    for (const item of order.itemsSnapshot) {
      y = checkPage(doc, y, 20);
      const prefix = item.quantity > 1 ? `${item.quantity}× ` : "";
      doc.setTextColor(...BLACK);
      doc.text(`  ${prefix}${item.name}`, marginX + 4, y + 9);
      doc.text(fmtBs(item.itemTotalBsCents), pageW - marginX - 4, y + 9, { align: "right" });
      y += 11;

      // Contornos
      for (const c of item.fixedContornos) {
        y = checkPage(doc, y, 10);
        doc.setTextColor(...GRAY);
        doc.text(`    - ${c.name}`, marginX + 8, y + 8);
        y += 9;
      }

      // Substitutions
      for (const a of item.selectedAdicionales.filter((a) => a.substitutesComponentId)) {
        y = checkPage(doc, y, 10);
        doc.setTextColor(128, 0, 128);
        doc.text(`    * ${a.name} (por ${a.substitutesComponentName})`, marginX + 8, y + 8);
        y += 9;
      }

      // Pure adicionales
      for (const a of item.selectedAdicionales.filter((a) => !a.substitutesComponentId)) {
        y = checkPage(doc, y, 10);
        doc.setTextColor(0, 128, 0);
        const qty = a.quantity ?? 1;
        doc.text(`    + ${qty > 1 ? `${qty}× ` : ""}${a.name} · ${fmtBs(a.priceBsCents * qty)}`, marginX + 8, y + 8);
        y += 9;
      }

      // Bebidas
      if (item.selectedBebidas) {
        for (const b of item.selectedBebidas) {
          y = checkPage(doc, y, 10);
          doc.setTextColor(0, 128, 128);
          const qty = b.quantity ?? 1;
          doc.text(`    + ${qty > 1 ? `${qty}× ` : ""}${b.name} (Bebida) · ${fmtBs(b.priceBsCents * qty)}`, marginX + 8, y + 8);
          y += 9;
        }
      }

      // Removals
      if (item.removedComponents) {
        for (const r of item.removedComponents) {
          y = checkPage(doc, y, 10);
          doc.setTextColor(200, 0, 0);
          doc.text(`    - Sin ${r.name}`, marginX + 8, y + 8);
          y += 9;
        }
      }
    }
    y += 4;
  }

  addSignatures(doc, y);
  return doc.output("blob");
}

// ───────────────────────────────────────────────────────────────────────────
// PDF #2 — Arqueo de Caja (desglose método × canal × modo)
// ───────────────────────────────────────────────────────────────────────────

export async function generateCashBreakdownPdf(
  rows: CashBreakdownRow[],
  meta: PdfMeta,
): Promise<Blob> {
  const doc = await createDoc();
  const marginX = 40;
  const pageW = 612;
  let y = printHeader(doc, "ARQUEO ANALÍTICO DE CAJA", meta);

  // Group by method
  const byMethod = new Map<string, CashBreakdownRow[]>();
  for (const r of rows) {
    if (!byMethod.has(r.paymentMethod)) byMethod.set(r.paymentMethod, []);
    byMethod.get(r.paymentMethod)!.push(r);
  }

  let grandOrders = 0, grandBs = 0, grandUsd = 0;

  for (const [method, methodRows] of byMethod) {
    y = checkPage(doc, y, 40);

    const mOrders = methodRows.reduce((s, r) => s + r.orderCount, 0);
    const mBs = methodRows.reduce((s, r) => s + r.totalBsCents, 0);
    const mUsd = methodRows.reduce((s, r) => s + r.totalUsdCents, 0);
    grandOrders += mOrders;
    grandBs += mBs;
    grandUsd += mUsd;

    // Method header
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y, pageW - marginX * 2, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(method, marginX + 6, y + 11);
    doc.text(`${mOrders} pedidos`, marginX + 250, y + 11, { align: "right" });
    doc.text(fmtBs(mBs), marginX + 380, y + 11, { align: "right" });
    doc.text(fmtUsd(mUsd), pageW - marginX - 6, y + 11, { align: "right" });
    y += 18;

    // Channel / mode breakdown
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const r of methodRows) {
      y = checkPage(doc, y, 12);
      doc.setTextColor(...GRAY);
      doc.text(`  ${r.channel} → ${r.orderMode}`, marginX + 10, y + 9);
      doc.setTextColor(...BLACK);
      doc.text(String(r.orderCount), marginX + 250, y + 9, { align: "right" });
      doc.text(fmtBs(r.totalBsCents), marginX + 380, y + 9, { align: "right" });
      doc.text(fmtUsd(r.totalUsdCents), pageW - marginX - 6, y + 9, { align: "right" });
      y += 12;
    }

    y += 6;
  }

  // Grand total
  y = checkPage(doc, y, 30);
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("TOTAL GENERAL", marginX + 6, y);
  doc.text(`${grandOrders}`, marginX + 250, y, { align: "right" });
  doc.text(fmtBs(grandBs), marginX + 380, y, { align: "right" });
  doc.text(fmtUsd(grandUsd), pageW - marginX - 6, y, { align: "right" });
  y += 8;

  // Credit / Returns note
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Cuentas por cobrar (Ventas a Crédito): N/A — Sistema 100% prepago", marginX + 6, y);
  y += 10;
  doc.text("Devoluciones registradas: 0,00 $ (0)", marginX + 6, y);

  addSignatures(doc, y);
  return doc.output("blob");
}

// ───────────────────────────────────────────────────────────────────────────
// PDF #3 — Auditoría de Conciliación Bancaria (Landscape para evitar colisiones)
// ───────────────────────────────────────────────────────────────────────────

export async function generateReconciliationPdf(
  rows: ReconciliationReportRow[],
  meta: PdfMeta,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "landscape" });
  const marginX = 40;
  const pageW = 792;
  const pageH = 612;

  // Custom landscape header
  let y = 40;
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...RED);
  doc.text(meta.restaurantName.toUpperCase(), pageW / 2, y, { align: "center" });
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("AUDITORÍA DE CONCILIACIÓN BANCARIA", pageW / 2, y, { align: "center" });
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  const printDate = new Date().toLocaleString("es-VE", { timeZone: "America/Caracas" });
  doc.text(`Rango: ${meta.fromDate} al ${meta.toDate}`, marginX, y);
  doc.text(`Impreso: ${printDate}`, pageW - marginX, y, { align: "right" });
  y += 10;
  doc.text(`Filtrado por: ${meta.roleLabel}`, marginX, y);
  y += 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 14;

  // Header row
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, pageW - marginX * 2, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  
  const cols = [
    { label: "Estado", x: marginX + 4 },
    { label: "#", x: 100 },
    { label: "Cliente", x: 140 },
    { label: "Canal", x: 250 },
    { label: "Ref. Cliente", x: 320 },
    { label: "Mto. Pedido", x: 455, align: "right" as const },
    { label: "Ref. SMS", x: 465 },
    { label: "Mto. SMS", x: 600, align: "right" as const },
    { label: "Fuente", x: 610 },
    { label: "Fecha", x: pageW - marginX - 4, align: "right" as const },
  ];
  for (const c of cols) {
    doc.text(c.label, c.x, y + 10, c.align ? { align: c.align } : undefined);
  }
  y += 14;

  const typeLabels: Record<string, string> = {
    reconciled: "Conciliado",
    manual_no_sms: "Manual",
    orphan_sms: "Huérfano",
    ambiguous_collision: "Colisión",
    amount_mismatch: "Monto ≠",
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (const r of rows) {
    if (y > 520) {
      doc.addPage();
      y = 40;
      doc.setFillColor(245, 245, 245);
      doc.rect(marginX, y, pageW - marginX * 2, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      for (const c of cols) {
        doc.text(c.label, c.x, y + 10, c.align ? { align: c.align } : undefined);
      }
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
    }

    doc.setTextColor(...BLACK);
    doc.text(typeLabels[r.type] ?? r.type, marginX + 4, y + 9);
    doc.text(r.orderNumber ? `#${r.orderNumber}` : "—", 100, y + 9);
    
    const cName = r.customerName || r.customerPhone || "—";
    const truncatedName = cName.length > 22 ? cName.substring(0, 20) + ".." : cName;
    doc.text(truncatedName, 140, y + 9);
    
    doc.text(r.channel || "—", 250, y + 9);
    doc.text(r.orderReference ?? "—", 320, y + 9);
    doc.text(r.orderTotalBsCents ? fmtBs(r.orderTotalBsCents) : "—", 455, y + 9, { align: "right" });
    doc.text(r.notificationReference ?? "—", 465, y + 9);
    doc.text(r.notificationAmountBsCents ? fmtBs(r.notificationAmountBsCents) : "—", 600, y + 9, { align: "right" });
    doc.text(r.notificationSource ?? "—", 610, y + 9);
    doc.text(fmtDate(r.createdAt), pageW - marginX - 4, y + 9, { align: "right" });

    doc.setDrawColor(230, 230, 230);
    doc.line(marginX, y + 12, pageW - marginX, y + 12);
    y += 12;
  }

  y += 30;
  if (y > 520) {
    doc.addPage();
    y = 40;
  }
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(marginX + 50, y, marginX + 250, y);
  doc.line(pageW - marginX - 250, y, pageW - marginX - 50, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text("Firma del Cajero", marginX + 150, y + 12, { align: "center" });
  doc.text("Supervisor", pageW - marginX - 150, y + 12, { align: "center" });

  return doc.output("blob");
}

// ───────────────────────────────────────────────────────────────────────────
// PDF #4 — Declaración IGTF (transacciones individuales + sumario)
// ───────────────────────────────────────────────────────────────────────────

export async function generateIgtfPdf(
  transactions: IgtfTransactionRow[],
  summary: IgtfSummaryRow[],
  meta: PdfMeta,
): Promise<Blob> {
  const doc = await createDoc();
  const marginX = 40;
  const pageW = 612;
  let y = printHeader(doc, "DECLARACIÓN DE PERCEPCIÓN IGTF (3%)", meta);

  // Summary section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text("RESUMEN DIARIO", marginX, y);
  y += 14;

  // Summary header
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, pageW - marginX * 2, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text("Fecha", marginX + 6, y + 10);
  doc.text("Pedidos", marginX + 120, y + 10, { align: "right" });
  doc.text("IGTF (Bs)", marginX + 220, y + 10, { align: "right" });
  doc.text("IGTF (USD)", marginX + 310, y + 10, { align: "right" });
  doc.text("Venta (Bs)", marginX + 410, y + 10, { align: "right" });
  doc.text("Venta (USD)", pageW - marginX - 6, y + 10, { align: "right" });
  y += 14;

  doc.setFont("helvetica", "normal");
  let totalIgtfBs = 0, totalIgtfUsd = 0;

  for (const s of summary) {
    y = checkPage(doc, y, 12);
    doc.setTextColor(...BLACK);
    doc.text(s.date, marginX + 6, y + 9);
    doc.text(String(s.orderCount), marginX + 120, y + 9, { align: "right" });
    doc.text(fmtBs(s.totalIgtfBsCents), marginX + 220, y + 9, { align: "right" });
    doc.text(fmtUsd(s.totalIgtfUsdCents), marginX + 310, y + 9, { align: "right" });
    doc.text(fmtBs(s.totalSalesBsCents), marginX + 410, y + 9, { align: "right" });
    doc.text(fmtUsd(s.totalSalesUsdCents), pageW - marginX - 6, y + 9, { align: "right" });
    totalIgtfBs += s.totalIgtfBsCents;
    totalIgtfUsd += s.totalIgtfUsdCents;
    y += 11;
  }

  // Summary total
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", marginX + 6, y + 9);
  doc.text(fmtBs(totalIgtfBs), marginX + 220, y + 9, { align: "right" });
  doc.text(fmtUsd(totalIgtfUsd), marginX + 310, y + 9, { align: "right" });
  y += 20;

  // Transaction-level detail
  y = checkPage(doc, y, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...RED);
  doc.text("DETALLE POR TRANSACCIÓN", marginX, y);
  y += 14;

  // Detail header
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y, pageW - marginX * 2, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLACK);
  doc.text("#", marginX + 6, y + 10);
  doc.text("Cliente", marginX + 40, y + 10);
  doc.text("Canal", marginX + 160, y + 10);
  doc.text("Método", marginX + 220, y + 10);
  doc.text("Venta (Bs)", marginX + 340, y + 10, { align: "right" });
  doc.text("IGTF (Bs)", marginX + 420, y + 10, { align: "right" });
  doc.text("IGTF (USD)", pageW - marginX - 6, y + 10, { align: "right" });
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  for (const t of transactions) {
    y = checkPage(doc, y, 12);
    doc.setTextColor(...BLACK);
    doc.text(`#${t.orderNumber}`, marginX + 6, y + 9);
    doc.text(t.customerName || t.customerPhone, marginX + 40, y + 9);
    doc.text(t.channel, marginX + 160, y + 9);
    doc.text(t.paymentMethod, marginX + 220, y + 9);
    doc.text(fmtBs(t.grandTotalBsCents), marginX + 340, y + 9, { align: "right" });
    doc.text(fmtBs(t.igtfBsCents), marginX + 420, y + 9, { align: "right" });
    doc.text(fmtUsd(t.igtfUsdCents), pageW - marginX - 6, y + 9, { align: "right" });
    y += 11;
  }

  addSignatures(doc, y);
  return doc.output("blob");
}

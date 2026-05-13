/**
 * Menu PDF Builder — Generates a letter-size (8.5×11") PDF
 * replicating the restaurant's Canva menu design.
 *
 * Uses jsPDF for client-side PDF generation.
 * Adapts font sizes dynamically so ALL items fit on a single page.
 */
import type { MenuPdfData } from "@/app/(admin)/admin/menu-del-dia/actions/generateMenuPdf";

// Letter size in points (1 inch = 72 pt)
const PAGE_W = 612; // 8.5"
const PAGE_H = 792; // 11"
const MARGIN_X = 36; // 0.5"
const MARGIN_TOP = 28;
const MARGIN_BOTTOM = 28;
const COL_GAP = 24;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const COL_W = (CONTENT_W - COL_GAP) / 2;

// Colors
const RED = [187, 0, 5] as const;      // #bb0005
const BLACK = [0, 0, 0] as const;
const GRAY = [100, 100, 100] as const;
const LIGHT_GRAY = [140, 140, 140] as const;

interface FontSizes {
  tierPrice: number;
  tierPriceRef: number;
  itemBullet: number;
  sectionHeader: number;
  simpleItem: number;
  simplePrice: number;
  footerText: number;
  includedNote: number;
  contornoText: number;
}

function computeFontSizes(totalItems: number): FontSizes {
  // Dynamic scaling: more items → smaller fonts
  if (totalItems <= 25) {
    return {
      tierPrice: 14, tierPriceRef: 11, itemBullet: 10,
      sectionHeader: 11, simpleItem: 9, simplePrice: 9,
      footerText: 9, includedNote: 8, contornoText: 9,
    };
  }
  if (totalItems <= 40) {
    return {
      tierPrice: 12, tierPriceRef: 10, itemBullet: 9,
      sectionHeader: 10, simpleItem: 8, simplePrice: 8,
      footerText: 8, includedNote: 7.5, contornoText: 8,
    };
  }
  if (totalItems <= 55) {
    return {
      tierPrice: 11, tierPriceRef: 9, itemBullet: 8,
      sectionHeader: 9, simpleItem: 7.5, simplePrice: 7.5,
      footerText: 7, includedNote: 7, contornoText: 7.5,
    };
  }
  // 55+ items — ultra compact
  return {
    tierPrice: 10, tierPriceRef: 8, itemBullet: 7.5,
    sectionHeader: 8.5, simpleItem: 7, simplePrice: 7,
    footerText: 7, includedNote: 6.5, contornoText: 7,
  };
}

function formatBs(usdCents: number, rate: number): string {
  const bs = (usdCents / 100) * rate;
  return bs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUsd(usdCents: number): string {
  return (usdCents / 100).toFixed(2).replace(".", ",");
}

/** Estimate vertical height needed for a tier block */
function estimateTierHeight(
  tier: MenuPdfData["priceTiers"][number],
  fs: FontSizes,
): number {
  let h = fs.tierPrice + 8; // price header + line spacing
  h += tier.items.length * (fs.itemBullet + 4); // item lines
  if (tier.sharedIncludedNote) h += fs.includedNote + 4;
  h += 10; // bottom spacing
  return h;
}

/** Estimate height for a simple section (Contornos/Adicionales/Bebidas) */
function estimateSectionHeight(
  title: string,
  items: { name: string }[],
  fs: FontSizes,
): number {
  if (items.length === 0) return 0;
  let h = fs.sectionHeader + 10; // header + spacing
  h += items.length * (fs.simpleItem + 4);
  h += 10; // bottom pad
  return h;
}

/**
 * Balance tiers across two columns using a greedy algorithm.
 * Returns [leftTierIndices, rightTierIndices].
 */
function balanceColumns(
  tiers: MenuPdfData["priceTiers"],
  fs: FontSizes,
): [number[], number[]] {
  const heights = tiers.map((t) => estimateTierHeight(t, fs));

  // Simple greedy: assign each tier to the shorter column
  const left: number[] = [];
  const right: number[] = [];
  let leftH = 0;
  let rightH = 0;

  for (let i = 0; i < tiers.length; i++) {
    if (leftH <= rightH) {
      left.push(i);
      leftH += heights[i];
    } else {
      right.push(i);
      rightH += heights[i];
    }
  }

  return [left, right];
}

export async function generateMenuPdf(data: MenuPdfData): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const totalItems =
    data.priceTiers.reduce((sum, t) => sum + t.items.length, 0) +
    data.adicionales.length +
    data.bebidas.length +
    data.contornos.length;

  const fs = computeFontSizes(totalItems);

  // ─── Header: Logo + "MENÚ DEL DÍA" ───
  let headerY = MARGIN_TOP;

  if (data.logoUrl) {
    try {
      const logo = await loadLogoWithWhiteBg(data.logoUrl);
      const logoH = 70;
      const ratio = logo.width / logo.height;
      const logoW = logoH * ratio;
      
      doc.addImage(logo.data, "JPEG", PAGE_W / 2 - logoW / 2, headerY, logoW, logoH);
      headerY += logoH + 20;

      doc.setFont("times", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...BLACK);
      doc.text("MENÚ DEL DÍA", PAGE_W / 2, headerY, { align: "center" });
      headerY += 24;
    } catch {
      // Fallback if logo fails
      doc.setFont("times", "bold");
      doc.setFontSize(26);
      doc.setTextColor(...BLACK);
      doc.text(data.restaurantName.toUpperCase(), PAGE_W / 2, headerY + 20, { align: "center" });
      doc.setFontSize(20);
      doc.setTextColor(...GRAY);
      doc.text("MENÚ DEL DÍA", PAGE_W / 2, headerY + 48, { align: "center" });
      headerY += 70;
    }
  } else {
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...BLACK);
    doc.text(data.restaurantName.toUpperCase(), PAGE_W / 2, headerY + 20, { align: "center" });
    doc.setFontSize(20);
    doc.setTextColor(...GRAY);
    doc.text("MENÚ DEL DÍA", PAGE_W / 2, headerY + 48, { align: "center" });
    headerY += 70;
  }

  // Thin separator line under header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, headerY, PAGE_W - MARGIN_X, headerY);
  headerY += 12;

  // ─── Footer area (reserve space) ───
  const footerH = 36;
  const footerY = PAGE_H - MARGIN_BOTTOM - footerH;

  // ─── Available content height ───
  const contentTop = headerY;

  // ─── Distribute tiers in two columns ───
  const [leftIndices, rightIndices] = balanceColumns(data.priceTiers, fs);

  // ─── Draw price tiers ───
  let leftY = contentTop;
  let rightY = contentTop;

  for (const idx of leftIndices) {
    leftY = drawTier(doc, data.priceTiers[idx], MARGIN_X, leftY, COL_W, data.rateBsPerUsd, fs);
  }

  for (const idx of rightIndices) {
    rightY = drawTier(doc, data.priceTiers[idx], MARGIN_X + COL_W + COL_GAP, rightY, COL_W, data.rateBsPerUsd, fs);
  }

  // ─── Bottom sections: Contornos + Adicionales (left col), Bebidas (right col) ───
  const bottomStartY = Math.max(leftY, rightY) + 12;

  let bottomLeftY = bottomStartY;

  // Contornos
  if (data.contornos.length > 0) {
    bottomLeftY = drawSectionHeader(doc, "CONTORNOS", MARGIN_X, bottomLeftY, COL_W, fs);
    // List contornos as a compact inline list
    doc.setFont("helvetica", "italic");
    doc.setFontSize(fs.contornoText);
    doc.setTextColor(...RED);
    const contornoStr = data.contornos.map(c => c).join("  •  ");
    const lines = doc.splitTextToSize(contornoStr, COL_W);
    for (const line of lines) {
      doc.text(line, MARGIN_X + (COL_W / 2), bottomLeftY, { align: "center" });
      bottomLeftY += fs.contornoText + 4;
    }
    bottomLeftY += 8;
  }

  // Adicionales
  if (data.adicionales.length > 0) {
    bottomLeftY = drawSectionHeader(doc, "ADICIONALES", MARGIN_X, bottomLeftY, COL_W, fs);
    for (const a of data.adicionales) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fs.simpleItem);
      doc.setTextColor(...BLACK);
      doc.text(a.name.toUpperCase(), MARGIN_X + 4, bottomLeftY);

      // Price right-aligned
      doc.setTextColor(...GRAY);
      doc.setFontSize(fs.simplePrice);
      const priceStr = `REF ${formatUsd(a.priceUsdCents)}`;
      doc.text(priceStr, MARGIN_X + COL_W - 4, bottomLeftY, { align: "right" });
      bottomLeftY += fs.simpleItem + 4;
    }
    bottomLeftY += 8;
  }

  // Bebidas (right column from bottomStartY)
  let bottomRightY = bottomStartY;
  if (data.bebidas.length > 0) {
    const rightX = MARGIN_X + COL_W + COL_GAP;
    bottomRightY = drawSectionHeader(doc, "BEBIDAS", rightX, bottomRightY, COL_W, fs);
    for (const b of data.bebidas) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fs.simpleItem);
      doc.setTextColor(...BLACK);
      doc.text(b.name.toUpperCase(), rightX + 4, bottomRightY);

      doc.setTextColor(...GRAY);
      doc.setFontSize(fs.simplePrice);
      const priceStr = `REF ${formatUsd(b.priceUsdCents)}`;
      doc.text(priceStr, rightX + COL_W - 4, bottomRightY, { align: "right" });
      bottomRightY += fs.simpleItem + 4;
    }
  }

  // ─── Footer ───
  const footerDrawY = PAGE_H - MARGIN_BOTTOM - 10;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, footerDrawY - 14, PAGE_W - MARGIN_X, footerDrawY - 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs.footerText);
  doc.setTextColor(...BLACK);
  doc.text("CONTAMOS CON SERVICIO A DOMICILIO", PAGE_W / 2, footerDrawY, { align: "center" });

  if (data.whatsappNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs.footerText);
    doc.setTextColor(...GRAY);
    const phone = data.whatsappNumber.startsWith("58")
      ? `+${data.whatsappNumber.slice(0, 2)} ${data.whatsappNumber.slice(2)}`
      : data.whatsappNumber;
    doc.text(`WhatsApp: ${phone}`, PAGE_W / 2, footerDrawY + fs.footerText + 4, { align: "center" });
  }

  return doc.output("blob");
}

function drawTier(
  doc: any,
  tier: MenuPdfData["priceTiers"][number],
  x: number,
  y: number,
  w: number,
  rate: number,
  fs: FontSizes,
): number {
  // Price header: "Bs. X,XXX.XX     Ref. X,XX$"
  doc.setFont("times", "bold");
  doc.setFontSize(fs.tierPrice);
  doc.setTextColor(...BLACK);
  const bsStr = `Bs. ${formatBs(tier.priceUsdCents, rate)}`;
  doc.text(bsStr, x, y);

  doc.setFont("times", "normal");
  doc.setFontSize(fs.tierPriceRef);
  doc.setTextColor(...GRAY);
  const refStr = `Ref. ${formatUsd(tier.priceUsdCents)}$`;
  doc.text(refStr, x + w - 4, y, { align: "right" });

  y += 6; // Move down before drawing the line

  // Separator under price
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + w - 4, y);
  
  y += 10; // Spacing after line

  // Items list
  for (const item of tier.items) {
    // Red bullet
    doc.setFillColor(...RED);
    // Align circle vertically with the middle of the text
    doc.circle(x + 4, y - (fs.itemBullet * 0.25), 1.6, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs.itemBullet);
    doc.setTextColor(...BLACK);
    doc.text(item.name.toUpperCase(), x + 12, y);
    y += fs.itemBullet + 4;
  }

  // Shared included note (e.g., "INCLUYE: PAPAS FRITAS Y BEBIDA")
  if (tier.sharedIncludedNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(fs.includedNote);
    doc.setTextColor(...LIGHT_GRAY);
    const noteLines = doc.splitTextToSize(`Incluye: ${tier.sharedIncludedNote}`, w - 16);
    y += 2; // Extra padding before note
    for (const line of noteLines) {
      doc.text(line, x + 12, y);
      y += fs.includedNote + 3;
    }
  }

  y += 8; // spacing after tier
  return y;
}

function drawSectionHeader(
  doc: any,
  title: string,
  x: number,
  y: number,
  w: number,
  fs: FontSizes,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs.sectionHeader);
  doc.setTextColor(...RED);

  const titleW = doc.getTextWidth(title);
  const padding = 8;
  const sideLineW = (w - titleW - (padding * 2)) / 2;
  
  // Center line vertically relative to text baseline
  const lineY = y - (fs.sectionHeader * 0.3);

  doc.setDrawColor(...RED);
  doc.setLineWidth(0.5);

  if (sideLineW > 0) {
    // Left line
    doc.line(x, lineY, x + sideLineW, lineY);
    // Right line
    doc.line(x + sideLineW + titleW + (padding * 2), lineY, x + w - 4, lineY);
  }

  doc.text(title, x + w / 2, y, { align: "center" });

  return y + fs.sectionHeader + 8;
}

/** 
 * Load an image from URL and return as base64 JPEG data URL.
 * Draws on a white canvas first to prevent transparent PNGs from rendering black.
 */
function loadLogoWithWhiteBg(url: string): Promise<{ data: string, width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({
          data: canvas.toDataURL("image/jpeg", 1.0),
          width: img.width,
          height: img.height
        });
      } else {
        reject(new Error("No canvas context available"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Generate a data URL preview of the first page */
export async function generateMenuPdfPreviewUrl(data: MenuPdfData): Promise<string> {
  const { default: jsPDF } = await import("jspdf");

  // Generate the same PDF but return as data URL
  const blob = await generateMenuPdf(data);
  return URL.createObjectURL(blob);
}

import { auth } from "@/lib/auth";
import { getActiveTables } from "@/db/queries/restaurant-tables";
import { generateQRDataURL, buildTableQRUrl } from "@/lib/qr";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tables = await getActiveTables();

  const tablesWithQR = await Promise.all(
    tables.map(async (table) => {
      const url = buildTableQRUrl(table.qrToken);
      const qrDataUrl = await generateQRDataURL(url);
      return { ...table, qrDataUrl };
    })
  );

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Hojas de QR - Mesas</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { 
          background: white; border: 2px solid #eee; border-radius: 12px; 
          padding: 20px; text-align: center; page-break-inside: avoid;
          display: flex; flex-direction: column; align-items: center;
        }
        .qr-img { width: 180px; height: 180px; margin-bottom: 10px; }
        .label { font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #1C0A00; }
        .section { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .capacity { font-size: 12px; background: #f9f9f9; padding: 4px 12px; border-radius: 20px; color: #888; }
        
        .print-btn {
          position: fixed; top: 20px; right: 20px; padding: 12px 24px;
          background: #8B2500; color: white; border: none; border-radius: 8px;
          cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        @media print {
          .print-btn { display: none; }
          body { background: white; padding: 0; }
          .grid { gap: 10px; }
          .card { border: 1px solid #ddd; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Imprimir Hojas</button>
      <div class="grid">
        ${tablesWithQR.map(table => `
          <div class="card">
            <img src="${table.qrDataUrl}" class="qr-img" alt="QR ${table.label}" />
            <div class="label">${table.label}</div>
            <div class="section">${table.section || 'Principal'}</div>
            <div class="capacity">Capacidad: ${table.capacity} pers.</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

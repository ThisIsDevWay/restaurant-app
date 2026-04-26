import { auth } from "@/lib/auth";
import { getTableById } from "@/db/queries/restaurant-tables";
import { generateQRBuffer, buildTableQRUrl } from "@/lib/qr";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const table = await getTableById(id);
  if (!table) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = buildTableQRUrl(table.qrToken);
  const buffer = await generateQRBuffer(url);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="mesa-${table.label.replace(/\s+/g, "-")}.png"`,
    },
  });
}

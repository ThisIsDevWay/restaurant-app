import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";

export async function GET() {
  const row = await db.query.settings.findFirst({
    columns: { whatsappNumber: true },
  });

  return NextResponse.json({
    whatsappNumber: row?.whatsappNumber ?? null,
  });
}

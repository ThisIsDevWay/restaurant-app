import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvDisplays } from "@/db/schema";
import { generateDisplayToken } from "@/lib/services/tv-pairing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();

  let displayName = "TV sin nombre";
  try {
    const body = (await req.json()) as { displayName?: string };
    if (body.displayName && body.displayName.trim().length > 0) {
      displayName = body.displayName.trim().slice(0, 80);
    }
  } catch {
    /* body is optional */
  }

  const displayToken = generateDisplayToken();

  const [display] = await db
    .insert(tvDisplays)
    .values({
      name: displayName,
      displayToken,
      linkedByUserId: session.user?.id as string | undefined,
    })
    .returning();

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const previewUrl = `${origin}/tv?token=${encodeURIComponent(displayToken)}`;

  return NextResponse.json({
    displayId: display.id,
    displayName: display.name,
    displayToken,
    previewUrl,
  });
}

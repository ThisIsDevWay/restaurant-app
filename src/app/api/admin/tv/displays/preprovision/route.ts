import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvDisplays, tvPairingSessions } from "@/db/schema";
import { max } from "drizzle-orm";
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

  const { display, displayToken } = await db.transaction(async (tx) => {
    const [maxRow] = await tx
      .select({ maxOrder: max(tvDisplays.displayOrder) })
      .from(tvDisplays);
    const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

    const token = generateDisplayToken();
    const [newDisplay] = await tx
      .insert(tvDisplays)
      .values({
        name: displayName,
        displayToken: token,
        linkedByUserId: session.user?.id as string | undefined,
        displayOrder: nextOrder,
      })
      .returning();

    await tx.insert(tvPairingSessions).values({
      pairingCode: `PRE-${newDisplay.id.slice(0, 6).toUpperCase()}`,
      status: "linked",
      linkedDisplayId: newDisplay.id,
      finalAccessToken: token,
      validatedByUserId: session.user?.id as string | undefined,
      validatedAt: new Date(),
      expiresAt: new Date(),
      source: "preprovision",
    });

    return { display: newDisplay, displayToken: token };
  });

  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  const previewUrl = `${origin}/tv?token=${encodeURIComponent(displayToken)}`;

  return NextResponse.json({
    displayId: display.id,
    displayName: display.name,
    displayToken,
    previewUrl,
  });
}
